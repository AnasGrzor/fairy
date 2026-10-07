"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { adminEmails, authConfigured } from "@/lib/supabase/env";
import { authClient, requireAdmin } from "@/lib/supabase/server";

export type FormState = { error?: string };

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  if (!authConfigured()) return { error: "Supabase isn't configured yet. See the README." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  /* Checked before contacting Supabase, so the page never reveals whether some other address has an account. */
  if (!adminEmails().includes(email)) return { error: "That email or password is wrong." };

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email or password is wrong." };
  redirect("/admin");
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

const Id = z.uuid();

/* Called straight from the dashboard (not a form post), so the card can move before the server answers. */
export async function confirmBooking(id: string): Promise<FormState> {
  await requireAdmin();
  const parsed = Id.safeParse(id);
  if (!parsed.success) return { error: "Unknown booking." };
  const { error } = await adminClient().rpc("confirm_booking", { p_id: parsed.data });
  if (error) {
    return {
      error: error.message.includes("is free")
        ? "Every room of this type is taken on some of these nights. Decline the request, or offer the guest other dates."
        : error.message,
    };
  }
  revalidatePath("/admin");
  return {};
}

const Status = z.enum(["declined", "cancelled"]);

export async function closeBooking(id: string, status: "declined" | "cancelled"): Promise<FormState> {
  await requireAdmin();
  const pid = Id.safeParse(id), pst = Status.safeParse(status);
  if (!pid.success || !pst.success) return { error: "Unknown booking." };
  /* Declining only applies to requests, cancelling only to confirmed stays. */
  const from = pst.data === "declined" ? "requested" : "confirmed";
  const { data, error } = await adminClient()
    .from("bookings")
    .update({ status: pst.data })
    .eq("id", pid.data)
    .eq("status", from)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "This booking changed in the meantime. Reload the page." };
  revalidatePath("/admin");
  return {};
}
