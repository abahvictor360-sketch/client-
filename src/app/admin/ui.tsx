"use client";

import { useActionState, useTransition } from "react";
import { addSuppression, deleteUser, grantCredits, runAgentNow } from "./actions";

type Result = { error?: string; message?: string } | undefined;

function Feedback({ state }: { state: Result }) {
  return (
    <span aria-live="polite" className="text-sm">
      {state?.error && <span className="text-danger">{state.error}</span>}
      {state?.message && <span className="text-success">{state.message}</span>}
    </span>
  );
}

export function RunAgentButton() {
  const [state, action, pending] = useActionState(runAgentNow, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button className="btn-primary" disabled={pending}>{pending ? "Running…" : "Run agent now"}</button>
      <Feedback state={state} />
    </form>
  );
}

export function GrantCreditsForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(grantCredits.bind(null, userId), undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`amount-${userId}`}>Amount in USD (negative to remove)</label>
        <input id={`amount-${userId}`} name="amount" type="number" step="1" inputMode="decimal" autoComplete="off" placeholder="$ amount" className="input !min-h-10 w-32 tabular-nums" />
        <label className="sr-only" htmlFor={`note-${userId}`}>Reason</label>
        <input id={`note-${userId}`} name="note" autoComplete="off" placeholder="Reason (optional)…" className="input !min-h-10 min-w-40 flex-1" />
        <button className="btn-secondary !min-h-10" disabled={pending}>{pending ? "Applying…" : "Apply"}</button>
      </div>
      <p className="hint">Use a negative number to remove credits.</p>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteUserForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(deleteUser.bind(null, userId), undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="confirm-user-delete" className="label">Type DELETE to confirm</label>
        <input id="confirm-user-delete" name="confirm" autoComplete="off" className="input !min-h-10 w-48" />
      </div>
      <button className="btn-secondary !min-h-10 !text-danger" disabled={pending}>{pending ? "Deleting…" : "Delete user"}</button>
      <Feedback state={state} />
    </form>
  );
}

export function SuppressionForm() {
  const [state, action, pending] = useActionState(addSuppression, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label htmlFor="suppress-email" className="sr-only">Email to block</label>
      <input id="suppress-email" name="email" type="email" required autoComplete="off" spellCheck={false} placeholder="name@company.com…" className="input !min-h-10 w-72" />
      <button className="btn-secondary !min-h-10" disabled={pending}>{pending ? "Adding…" : "Never email this address"}</button>
      <Feedback state={state} />
    </form>
  );
}

/** A small button that runs a bound server action after a confirmation. */
export function ConfirmButton({
  action,
  label,
  confirmText,
  danger = false,
}: {
  action: () => Promise<void>;
  label: string;
  confirmText?: string;
  danger?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className={`btn-quiet !min-h-9 ${danger ? "!text-danger" : ""}`}
      disabled={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        startTransition(() => action());
      }}
    >
      {pending ? "Working…" : label}
    </button>
  );
}
