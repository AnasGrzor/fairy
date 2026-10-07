import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminEmails, authConfigured, publishableKey, supabaseUrl } from "@/lib/supabase/env";

/* Session-aware client for Supabase Auth (the /admin sign-in). It uses the publishable key,
   so on its own it can read no booking data; admin pages read bookings with adminClient() after requireAdmin(). */
export async function authClient() {
  const store = await cookies();
  return createServerClient(supabaseUrl()!, publishableKey()!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Called from a server component, where cookies are read-only. proxy.ts refreshes the session instead. */
        }
      },
    },
  });
}

/** Signed-in user whose email is in ADMIN_EMAILS, or a redirect to the sign-in page. */
export async function requireAdmin() {
  if (!authConfigured()) redirect("/admin/login");
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!data.user || !email) redirect("/admin/login");
  if (!adminEmails().includes(email)) redirect("/admin/login?error=not-allowed");
  return data.user;
}
