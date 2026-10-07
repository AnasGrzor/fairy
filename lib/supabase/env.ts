/* Accepts both the current Supabase key names and the older anon/service_role names the Vercel integration may set. */
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
export const publishableKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const secretKey = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const bookingsConfigured = () => !!(supabaseUrl() && secretKey());
export const authConfigured = () => !!(supabaseUrl() && publishableKey());

/** Emails allowed into /admin, from ADMIN_EMAILS (comma separated). */
export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
