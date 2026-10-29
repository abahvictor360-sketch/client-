"use client";

import { Loader2, Plus, SendHorizontal, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addSegmentItem, createSegment, removeSegmentItem, steerCampaign } from "../../../actions";

/** Editable chips for one list in a buyer type's brief or targeting. */
export function ChipList({ businessId, segmentId, field, label, items, placeholder, icon }: {
  businessId: string;
  segmentId: string;
  field: string;
  label: string;
  items: string[];
  placeholder: string;
  icon?: React.ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  const [removing, startRemove] = useTransition();
  const [state, action, pending] = useActionState(async (prev: { error?: string } | undefined, form: FormData) => {
    const result = await addSegmentItem(businessId, segmentId, field, prev, form);
    if (!result?.error) setAdding(false);
    return result;
  }, undefined);
  const id = `${field}-input`;

  return (
    <section aria-labelledby={`${field}-label`}>
      <h3 id={`${field}-label`} className="flex items-center gap-2 font-semibold">{icon}{label}</h3>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-1 rounded-[10px] bg-surface py-1 pl-3 pr-1 text-sm ring-1 ring-line">
            {item}
            <button
              type="button"
              disabled={removing}
              onClick={() => startRemove(() => removeSegmentItem(businessId, segmentId, field, item))}
              className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
              aria-label={`Remove ${item}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
        <li>
          {adding ? (
            <form action={action} className="flex gap-1.5">
              <label htmlFor={id} className="sr-only">Add to {label}</label>
              <input id={id} name="value" autoFocus maxLength={80} placeholder={placeholder} autoComplete="off"
                className="input !min-h-9 w-52 !text-sm" onKeyDown={(e) => e.key === "Escape" && setAdding(false)} />
              <button className="btn-primary !min-h-9 !px-3" disabled={pending}>{pending ? "…" : "Add"}</button>
            </form>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="flex min-h-9 items-center gap-1 rounded-[10px] px-3 text-sm text-muted ring-1 ring-line hover:text-ink">
              <Plus size={14} aria-hidden="true" /> Add
            </button>
          )}
        </li>
      </ul>
      {state?.error && <p role="alert" className="mt-1.5 text-sm text-danger">{state.error}</p>}
    </section>
  );
}

/** "Steer the campaign": a message to the agent, which rewrites the brief and targeting. */
export function SteerForm({ businessId, segmentId }: { businessId: string; segmentId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(steerCampaign.bind(null, businessId, segmentId), undefined);
  useEffect(() => {
    if (!pending && !state?.error) ref.current?.reset();
  }, [pending, state]);
  return (
    <form ref={ref} action={action}>
      {pending && (
        <p role="status" className="mb-2 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Updating your campaign…
        </p>
      )}
      {state?.error && <p role="alert" className="mb-2 text-sm text-danger">{state.error}</p>}
      <div className="flex items-end gap-2 rounded-[18px] bg-surface p-2 pl-4 shadow-[var(--shadow-float)] ring-1 ring-line focus-within:ring-teal">
        <label htmlFor="instruction" className="sr-only">Steer the campaign</label>
        <textarea
          id="instruction"
          name="instruction"
          rows={1}
          required
          maxLength={1000}
          placeholder="Steer the campaign… e.g. “Focus on Lagos and Abuja only”"
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base outline-none [field-sizing:content] placeholder:text-muted/80"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button className="btn-primary !min-h-10 !px-3" disabled={pending} aria-label="Send">
          <SendHorizontal size={17} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

export function NewSegmentForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(createSegment.bind(null, businessId), undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="description" className="label">Who should the agent reach?</label>
        <textarea id="description" name="description" rows={4} required minLength={10} maxLength={600} autoFocus
          className="input min-h-28 py-2.5"
          placeholder="e.g. Private schools in Lagos with 200+ students whose websites look outdated. Talk to the proprietor or head of admin." />
        <p className="hint">The agent turns this into job titles, industries, locations and an offer. You can edit everything afterwards.</p>
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? <><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Creating…</> : "Create buyer type"}
      </button>
    </form>
  );
}
