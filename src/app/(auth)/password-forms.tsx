"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, updatePassword } from "./actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="panel w-full max-w-md space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl">Reset your password</h1>
        <p className="mt-2 text-muted">We&apos;ll email you a link to choose a new one.</p>
      </div>
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" spellCheck={false} />
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.message && (
        <p role="status" className="rounded-[var(--radius-control)] bg-success-soft px-3 py-2 text-sm text-success">{state.message}</p>
      )}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Sending link…" : "Send reset link"}</button>
      <p className="text-center text-sm text-muted">
        Remembered it? <Link href="/login" className="font-semibold text-ink underline underline-offset-4">Sign in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="panel w-full max-w-md space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl">Choose a new password</h1>
        <p className="mt-2 text-muted">You&apos;ll sign in with it from now on.</p>
      </div>
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="hint">At least 8 characters.</p>
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
