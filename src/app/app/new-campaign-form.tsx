"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createBusiness } from "./actions";

export function NewCampaignForm({
  website,
  about,
  autoStart = false,
}: {
  website?: string;
  about?: string;
  /** Submit right away: the visitor already entered this on the landing page. */
  autoStart?: boolean;
}) {
  const [state, action, pending] = useActionState(createBusiness, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    formRef.current?.requestSubmit();
  }, [autoStart]);
  const [noWebsite, setNoWebsite] = useState(Boolean(about) && !website);
  const errorId = "campaign-error";
  const hintId = "campaign-hint";

  return (
    <form ref={formRef} action={action}>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor="campaign-source" className="label">
          {noWebsite ? "Describe your business" : "Your business website"}
        </label>
        <button type="button" onClick={() => setNoWebsite((v) => !v)} className="btn-quiet -mr-3 mb-0.5 !min-h-9">
          {noWebsite ? "I have a website" : "I don't have a website"}
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        {noWebsite ? (
          <textarea
            key="about"
            id="campaign-source"
            name="about"
            required
            minLength={15}
            maxLength={500}
            rows={3}
            defaultValue={about}
            placeholder="e.g. We supply wholesale silk flowers to event planners and florists in Lagos…"
            aria-invalid={state?.error ? true : undefined}
            aria-describedby={state?.error ? errorId : hintId}
            className="input min-h-24 flex-1 py-2.5"
          />
        ) : (
          <input
            key="website"
            id="campaign-source"
            name="website"
            required
            defaultValue={website}
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="yourbusiness.com…"
            aria-invalid={state?.error ? true : undefined}
            aria-describedby={state?.error ? errorId : hintId}
            className="input min-h-12 flex-1"
          />
        )}
        <button className="btn-primary min-h-12" disabled={pending}>
          {pending ? "Getting started…" : "Find my leads"}
        </button>
      </div>
      {state?.error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">{state.error}</p>
      ) : (
        <p id={hintId} className="hint">We study your business and propose the customers to target. Nothing is sent until you review and press Start.</p>
      )}
    </form>
  );
}
