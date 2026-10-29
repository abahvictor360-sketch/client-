"use client";

import { useActionState } from "react";
import { updateBusinessLimits } from "../../actions";

export function LimitsForm({ id, dailyBudgetCents, maxPerDay }: { id: string; dailyBudgetCents: number; maxPerDay: number }) {
  const [state, action, pending] = useActionState(updateBusinessLimits.bind(null, id), undefined);
  return (
    <form action={action} className="mt-4 space-y-4">
      <div>
        <label className="label" htmlFor="daily_budget">Daily budget in USD</label>
        <input className="input tabular-nums" id="daily_budget" name="daily_budget" type="number" min={0} max={10000} step="0.5"
          inputMode="decimal" autoComplete="off" defaultValue={dailyBudgetCents / 100} />
      </div>
      <div>
        <label className="label" htmlFor="max_emails_per_day">Most emails per day</label>
        <input className="input tabular-nums" id="max_emails_per_day" name="max_emails_per_day" type="number" min={0} max={500}
          inputMode="numeric" autoComplete="off" defaultValue={maxPerDay} aria-describedby="max-hint" />
        <p id="max-hint" className="hint">New domains should start under 50 a day.</p>
      </div>
      <button className="btn-secondary w-full" disabled={pending}>{pending ? "Saving…" : "Save limits"}</button>
      <p aria-live="polite" className="text-sm">
        {state?.error && <span className="text-danger">{state.error}</span>}
        {state?.message && <span className="text-success">{state.message}</span>}
      </p>
    </form>
  );
}
