import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { secretKey, supabaseUrl } from "@/lib/supabase/env";

/* Secret-key client. It bypasses row level security, so it only ever runs on the server,
   and only after the caller has been checked (a validated guest request, or a signed-in admin). */
let client: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  if (client) return client;
  const url = supabaseUrl(), key = secretKey();
  if (!url || !key) throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type BookingStatus = "requested" | "confirmed" | "declined" | "cancelled";

export type BookingRow = {
  id: string;
  ref: string;
  room_id: string;
  unit_id: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  guest_name: string;
  phone: string;
  email: string | null;
  quoted_total_pkr: number;
  status: BookingStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  room_units?: { label: string } | null;
};
