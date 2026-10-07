import { karachiToday } from "@/lib/booking-rules";
import { ROOMS } from "@/lib/data";
import { adminClient } from "@/lib/supabase/admin";
import { bookingsConfigured } from "@/lib/supabase/env";
import { addDays } from "@/lib/util";

/* Fully booked nights per room type for the next 13 months. Only dates leave the server, never guest details.
   The form uses this to warn early; the booking action checks again before saving. */
export async function GET() {
  if (!bookingsConfigured()) return Response.json({ configured: false, rooms: {} });

  const from = karachiToday(), to = addDays(from, 400);
  const db = adminClient();
  const results = await Promise.all(
    ROOMS.map(async (r) => {
      const { data, error } = await db.rpc("fully_booked_nights", { p_room: r.id, p_from: from, p_to: to });
      if (error) throw error;
      return [r.id, (data as string[] | null) ?? []] as const;
    }),
  ).catch((err) => {
    console.error("[availability]", err);
    return null;
  });
  if (!results) return Response.json({ configured: true, rooms: {} }, { status: 502 });

  return Response.json(
    { configured: true, rooms: Object.fromEntries(results) },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=45" } },
  );
}
