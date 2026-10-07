"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/admin/actions";

export function LoginForm({ notAllowed }: { notAllowed: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {
    error: notAllowed ? "This account can't open the bookings page." : undefined,
  });
  return (
    <form action={action} className="mt-5 grid gap-4">
      <div className="grid min-w-0 gap-2">
        <label className="text-[14px] font-medium" htmlFor="email">Email</label>
        <input className="min-h-12 w-full min-w-0 rounded-input border-0 bg-bg-2 px-3.5 text-[16px] text-fg shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-placeholder focus:shadow-[inset_0_0_0_2px_var(--accent)] focus:outline-none" id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="grid min-w-0 gap-2">
        <label className="text-[14px] font-medium" htmlFor="password">Password</label>
        <input className="min-h-12 w-full min-w-0 rounded-input border-0 bg-bg-2 px-3.5 text-[16px] text-fg shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-placeholder focus:shadow-[inset_0_0_0_2px_var(--accent)] focus:outline-none" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && <p className="text-[13px] text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-lantern disabled:cursor-progress disabled:opacity-60" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
