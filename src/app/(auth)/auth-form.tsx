"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

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
  const [showPassword, setShowPassword] = useState(false);
  const signup = mode === "signup";

  return (
    <form action={formAction} className="panel w-full max-w-md space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl">{signup ? "Create your account" : "Welcome back"}</h1>
        {website ? (
          <p className="mt-2 text-muted">
            Next, the agent starts reading <span className="font-semibold text-ink" translate="no">{website}</span>.
          </p>
        ) : (
          <p className="mt-2 text-muted">{signup ? "It takes about a minute." : "Sign in to check on your agent."}</p>
        )}
      </div>
      <input type="hidden" name="website" value={website ?? ""} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" spellCheck={false} />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <div className="relative">
          <input
            className="input pr-12"
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete={signup ? "new-password" : "current-password"}
            aria-describedby={signup ? "password-hint" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {signup && <p id="password-hint" className="hint">At least 8 characters.</p>}
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.message && <p role="status" className="rounded-[var(--radius-control)] bg-success-soft px-3 py-2 text-sm text-success">{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-muted">
        {signup ? (
          <>Already have an account? <Link href="/login" className="font-semibold text-ink underline underline-offset-4">Sign in</Link></>
        ) : (
          <>New here? <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">Create an account</Link></>
        )}
      </p>
    </form>
  );
}
