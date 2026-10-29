"use client";

import Link from "next/link";
import { useActionState } from "react";

type State = { error?: string; message?: string } | undefined;

export function AuthForm({
  mode,
  action,
  website,
  next,
}: {
  mode: "login" | "signup";
  action: (state: State, form: FormData) => Promise<State>;
  website?: string;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="card w-full max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-medium">{mode === "login" ? "Sign in" : "Create your account"}</h1>
      {website && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
          We&apos;ll start learning <span className="font-medium">{website}</span> right after you sign up.
        </p>
      )}
      <input type="hidden" name="website" value={website ?? ""} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.message && <p className="text-sm text-accent">{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>No account? <Link href="/signup" className="text-fg underline">Sign up</Link></>
        ) : (
          <>Have an account? <Link href="/login" className="text-fg underline">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
