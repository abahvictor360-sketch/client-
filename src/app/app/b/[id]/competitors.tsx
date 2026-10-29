"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import type { Competitor } from "@/lib/types";
import { addCompetitor, removeCompetitor } from "../../actions";

const SHOWN = 6;

/** Editable competitor chips, as on the "Is this your company?" step. */
export function CompetitorsEditor({ id, competitors }: { id: string; competitors: Competitor[] }) {
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [removing, startRemove] = useTransition();
  const [state, action, pending] = useActionState(async (prev: { error?: string } | undefined, form: FormData) => {
    const result = await addCompetitor(id, prev, form);
    if (!result?.error) setAdding(false);
    return result;
  }, undefined);
  const visible = expanded ? competitors : competitors.slice(0, SHOWN);

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="eyebrow" id="competitors-label">Competitors</p>
        <button type="button" className="btn-secondary !min-h-8 !rounded-[9px] !px-2" onClick={() => setAdding((v) => !v)} aria-expanded={adding} aria-label="Add a competitor">
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
      {adding && (
        <form action={action} className="mt-3 flex max-w-md gap-2">
          <label htmlFor="competitor-domain" className="sr-only">Competitor website</label>
          <input id="competitor-domain" name="domain" className="input !min-h-10" placeholder="rival.com…" autoFocus inputMode="url" autoComplete="off" spellCheck={false} />
          <button className="btn-primary !min-h-10" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
        </form>
      )}
      {state?.error && <p role="alert" className="mt-1.5 text-sm text-danger">{state.error}</p>}
      <ul aria-labelledby="competitors-label" className="mt-3 flex flex-wrap gap-2">
        {visible.map((c) => (
          <li key={c.domain} className="flex items-center gap-1.5 rounded-[10px] bg-surface py-1 pl-2.5 pr-1 font-mono text-sm ring-1 ring-line" title={c.note || undefined}>
            <span translate="no">{c.domain}</span>
            <button
              type="button"
              disabled={removing}
              onClick={() => startRemove(() => removeCompetitor(id, c.domain))}
              className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
              aria-label={`Remove ${c.domain}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
        {competitors.length > SHOWN && (
          <li>
            <button type="button" onClick={() => setExpanded((v) => !v)} className="min-h-9 rounded-[10px] px-3 text-sm text-muted ring-1 ring-line hover:text-ink">
              {expanded ? "Show fewer" : `+${competitors.length - SHOWN} more`}
            </button>
          </li>
        )}
        {competitors.length === 0 && <li className="text-sm text-muted">None found. Add the businesses prospects compare you with.</li>}
      </ul>
    </div>
  );
}
