"use server";

import { after } from "next/server";
import { z } from "zod";
import { checkStay, karachiToday, MAX_GUESTS, normalizePhone, quotePkr } from "@/lib/booking-rules";
import { roomById, type RoomId } from "@/lib/data";
import { adminClient } from "@/lib/supabase/admin";
import { bookingsConfigured } from "@/lib/supabase/env";
import { dfmt, fmt } from "@/lib/util";

const ROOM_IDS = ["standard", "deluxe", "family", "tent"] as const satisfies readonly RoomId[];

const Input = z.object({
  room: z.enum(ROOM_IDS),
  cin: z.iso.date(),
  cout: z.iso.date(),
  guests: z.int().min(1).max(MAX_GUESTS),
  name: z.string().trim().min(1, "Add your name so Sami knows who is coming.").max(120),
  phone: z.string().trim().max(30),
  email: z.union([z.literal(""), z.email("That email address doesn't look right.").max(200)]),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.string().max(0).optional(),
});

export type BookingRequest = z.input<typeof Input>;
export type BookingField = "dates" | "guests" | "name" | "phone" | "email";
export type BookingResult =
  | { ok: true; ref: string }
  | { ok: false; error: string; field?: BookingField; code?: "unconfigured" | "booked" | "failed"; booked?: string[] };

export async function requestBooking(raw: BookingRequest): Promise<BookingResult> {
  if (!bookingsConfigured()) {
    return { ok: false, code: "unconfigured", error: "Online booking isn't switched on yet. Send your request on WhatsApp instead." };
  }

  const parsed = Input.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const key = issue.path[0];
    if (key === "website") return { ok: true, ref: "FM-000000" }; // a bot; pretend it worked
    const field: BookingField | undefined =
      key === "name" || key === "email" ? key : key === "cin" || key === "cout" ? "dates" : key === "guests" ? "guests" : undefined;
    return { ok: false, field, error: issue.message.startsWith("Invalid") ? "Something in the form isn't right. Check it and try again." : issue.message };
  }
  const v = parsed.data;

  const phone = normalizePhone(v.phone);
  if (!phone) return { ok: false, field: "phone", error: "Add a phone number with WhatsApp, like 0331 1332031 or +44 7700 900123." };

  const { nights, dateErr, guestErr } = checkStay({ room: v.room, cin: v.cin, cout: v.cout, guests: v.guests, today: karachiToday() });
  if (dateErr) return { ok: false, field: "dates", error: dateErr };
  if (guestErr) return { ok: false, field: "guests", error: guestErr };

  const db = adminClient();
  const room = roomById(v.room);

  const { data: booked, error: availErr } = await db.rpc("fully_booked_nights", { p_room: v.room, p_from: v.cin, p_to: v.cout });
  if (availErr) return failed(availErr);
  if (Array.isArray(booked) && booked.length) {
    const list = (booked as string[]).map((d) => dfmt(d)).join(", ");
    return { ok: false, field: "dates", code: "booked", booked: booked as string[], error: `The ${room.phrase} is already booked on ${list}. Pick other dates or another room.` };
  }

  const total = quotePkr(v.room, nights);
  const { data, error } = await db
    .from("bookings")
    .insert({
      room_id: v.room,
      check_in: v.cin,
      check_out: v.cout,
      guests: v.guests,
      guest_name: v.name,
      phone,
      email: v.email || null,
      quoted_total_pkr: total,
    })
    .select("ref")
    .single();
  if (error || !data) return failed(error);

  const ref = data.ref as string;
  after(() =>
    notifySami({ ref, room: room.name, cin: v.cin, cout: v.cout, nights, guests: v.guests, name: v.name, phone, email: v.email, total }),
  );
  return { ok: true, ref };
}

function failed(err: unknown): BookingResult {
  console.error("[booking] save failed", err);
  return { ok: false, code: "failed", error: "We couldn't save your request just now. Send it on WhatsApp and Sami will sort it out." };
}

/* Optional email alert through Resend. Set RESEND_API_KEY and BOOKING_NOTIFY_EMAIL to turn it on. */
async function notifySami(b: {
  ref: string; room: string; cin: string; cout: string; nights: number; guests: number; name: string; phone: string; email: string; total: number;
}) {
  const key = process.env.RESEND_API_KEY, to = process.env.BOOKING_NOTIFY_EMAIL;
  if (!key || !to) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const lines = [
    `New booking request ${b.ref}`,
    "",
    `${b.room}, ${dfmt(b.cin)} to ${dfmt(b.cout)} (${b.nights} night${b.nights === 1 ? "" : "s"})`,
    `${b.guests} guest${b.guests === 1 ? "" : "s"}, about Rs ${fmt(b.total)}`,
    "",
    `${b.name}`,
    `Phone: ${b.phone}`,
    b.email ? `Email: ${b.email}` : "",
    "",
    site ? `Confirm or decline: ${site}/admin` : "Confirm or decline it in /admin.",
  ].filter((l, i, a) => l || a[i - 1]);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.BOOKING_FROM_EMAIL ?? "Fairy Meadows bookings <onboarding@resend.dev>",
        to: to.split(",").map((s) => s.trim()),
        subject: `Booking request ${b.ref}: ${b.room}, ${dfmt(b.cin)}`,
        text: lines.join("\n"),
        reply_to: b.email || undefined,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[booking] email alert failed", res.status, await res.text());
  } catch (err) {
    console.error("[booking] email alert failed", err);
  }
}
