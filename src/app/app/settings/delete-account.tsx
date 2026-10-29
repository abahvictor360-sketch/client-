"use client";

import { useActionState } from "react";
import { deleteAccount } from "../actions";

export function DeleteAccountPanel() {
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  return (
    <section className="panel space-y-4 border-danger/30 p-6" aria-labelledby="danger-title">
      <div>
        <h2 id="danger-title" className="text-xl text-danger">Delete account</h2>
        <p className="mt-1 text-sm text-muted">
          Permanently deletes your account, campaigns, prospects, conversations and sending domains. This can&apos;t be
          undone. Unused credits are not refunded.
        </p>
      </div>
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="confirm-delete" className="label">Type DELETE to confirm</label>
          <input id="confirm-delete" name="confirm" autoComplete="off" className="input" />
        </div>
        <button className="btn-secondary !text-danger" disabled={pending}>{pending ? "Deleting…" : "Delete my account"}</button>
      </form>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </section>
  );
}
