"use client";

import { useActionState } from "react";

type State = { error?: string; message?: string } | undefined;

/** A form posting to a server action, with a pending button and an inline result. */
export function ActionForm({ action, submitLabel, pendingLabel = "Saving…", children, className = "space-y-5", secondary, submitClassName = "btn-primary" }: {
  action: (state: State, form: FormData) => Promise<State>;
  submitLabel: React.ReactNode;
  pendingLabel?: string;
  children: React.ReactNode;
  className?: string;
  /** Extra controls placed left of the submit button (e.g. Back). */
  secondary?: React.ReactNode;
  submitClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          {secondary}
          <p aria-live="polite" className="text-sm">
            {state?.error && <span className="text-danger">{state.error}</span>}
            {state?.message && <span className="text-success">{state.message}</span>}
          </p>
        </div>
        <button className={submitClassName} disabled={pending}>{pending ? pendingLabel : submitLabel}</button>
      </div>
    </form>
  );
}
