// Creates (or resets the password of) an admin login for /admin.
// Usage: node --env-file=.env.local scripts/create-admin.mjs sami@example.com 'a-long-password'
// The email must also be listed in ADMIN_EMAILS.
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 10) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password of 10+ characters>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first (see .env.example).");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: list, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;
const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

const { error } = existing
  ? await db.auth.admin.updateUserById(existing.id, { password })
  : await db.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;

const admins = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((s) => s.trim());
console.log(`${existing ? "Updated" : "Created"} ${email}.`);
if (!admins.includes(email.toLowerCase())) console.log(`Add ${email} to ADMIN_EMAILS, or /admin will refuse it.`);
