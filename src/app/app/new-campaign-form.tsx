"use client";

import { useActionState } from "react";
import { createBusiness } from "./actions";

export function NewCampaignForm({ website }: { website?: string }) {
  const [state, action, pending] = useActionState(createBusiness, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2 rounded-2xl border-2 border-fg bg-surface p-2">
        <input
          name="website"
          required
          defaultValue={website}
          placeholder="Paste your website, e.g. acme.com"
          className="min-w-0 flex-1 bg-transparent px-3 outline-none"
        />
        <button className="btn-primary" disabled={pending}>
          {pending ? "Starting…" : "Start →"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
