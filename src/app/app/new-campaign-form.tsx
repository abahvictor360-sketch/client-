"use client";

import { useActionState } from "react";
import { createBusiness } from "./actions";

export function NewCampaignForm({ website }: { website?: string }) {
  const [state, action, pending] = useActionState(createBusiness, undefined);
  return (
    <form action={action} noValidate={false}>
      <label htmlFor="website" className="label">Website to sell</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="website"
          name="website"
          required
          defaultValue={website}
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          placeholder="acme.com…"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "website-error" : "website-hint"}
          className="input min-h-12 flex-1"
        />
        <button className="btn-primary min-h-12" disabled={pending}>
          {pending ? "Starting analysis…" : "Analyze website"}
        </button>
      </div>
      {state?.error ? (
        <p id="website-error" role="alert" className="mt-1.5 text-sm text-danger">{state.error}</p>
      ) : (
        <p id="website-hint" className="hint">Nothing is sent until you review the buyer types and press Start.</p>
      )}
    </form>
  );
}
