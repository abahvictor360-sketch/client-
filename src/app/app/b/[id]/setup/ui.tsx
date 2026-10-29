"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { correctBusiness, finishSetupLater, launchBusiness } from "../../../actions";

/** "No, that's not us": lets the owner describe the business and re-run the analysis. */
export function NotUs({ id, children }: { id: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(correctBusiness.bind(null, id), undefined);
  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>No, that&rsquo;s not us</button>
        {children}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-[20px] bg-canvas p-4 ring-1 ring-line">
      <label htmlFor="about" className="label">Tell us what your business actually does</label>
      <textarea id="about" name="about" rows={3} required minLength={15} maxLength={500} autoFocus className="input min-h-24 py-2.5"
        placeholder="e.g. We supply wholesale silk flowers to event planners and florists in Lagos…" />
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn-primary" disabled={pending}>{pending ? "Starting over…" : "Analyze again"}</button>
      </div>
    </form>
  );
}

export function LaunchButtons({ id }: { id: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [later, startLater] = useTransition();
  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-[14px] bg-surface-2 p-3 text-sm text-danger">{error}</p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button className="btn-quiet" disabled={later || pending} onClick={() => startLater(() => finishSetupLater(id))}>
          {later ? "Saving…" : "Start later"}
        </button>
        <button
          className="btn-primary"
          disabled={pending || later}
          onClick={() =>
            startTransition(async () => {
              const result = await launchBusiness(id);
              setError(result?.error);
            })
          }
        >
          {pending ? <><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Launching…</> : <>Launch campaign <ArrowRight size={16} aria-hidden="true" /></>}
        </button>
      </div>
    </div>
  );
}
