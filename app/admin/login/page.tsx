import { LoginForm } from "@/components/admin/login-form";
import { authConfigured } from "@/lib/supabase/env";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4 py-6 supports-[min-height:100dvh]:min-h-dvh">
      <div className="grid w-[min(400px,100%)] gap-1 rounded-[12px] border border-line bg-bg-2 px-6 py-7">
        <h1 className="font-sans normal-case tracking-normal leading-tight font-semibold text-[24px]">Bookings</h1>
        <p className="text-[14px] text-fg-2">Fairy Meadows Comfort Lodges</p>
        {!authConfigured() ? (
          <p className="text-[13px] text-danger">Supabase isn&apos;t configured yet. Add the keys from the README to the environment.</p>
        ) : (
          <LoginForm notAllowed={error === "not-allowed"} />
        )}
      </div>
    </main>
  );
}
