"use client";

import { useActionState } from "react";
import { grantCredits } from "./actions";

export function GrantCreditsForm({ userId, email }: { userId: string; email: string }) {
  const [state, action, pending] = useActionState(grantCredits.bind(null, userId), undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label htmlFor={`amount-${userId}`} className="sr-only">Credits in USD for {email}</label>
      <input
        id={`amount-${userId}`}
        name="amount"
        type="number"
        step="1"
        inputMode="decimal"
        autoComplete="off"
        placeholder="$"
        className="input !min-h-9 w-20 tabular-nums"
      />
      <button className="btn-secondary !min-h-9 !px-3" disabled={pending}>{pending ? "…" : "Apply"}</button>
      {state?.error && <span role="alert" className="text-xs text-danger">{state.error}</span>}
      {state?.message && <span role="status" className="text-xs text-success">{state.message}</span>}
    </form>
  );
}
