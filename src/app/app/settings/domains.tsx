"use client";

import { useActionState } from "react";
import type { SendingDomain } from "@/lib/domains";
import { addDomain, checkDomain, removeDomain } from "../actions";

function CheckButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(checkDomain.bind(null, id), undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button className="btn-secondary !min-h-9" disabled={pending}>{pending ? "Checking…" : "Check verification"}</button>
      <span aria-live="polite" className="text-sm">
        {state?.error && <span className="text-danger">{state.error}</span>}
        {state?.message && <span className="text-muted">{state.message}</span>}
      </span>
    </form>
  );
}

export function DomainsPanel({ domains }: { domains: SendingDomain[] }) {
  const [state, action, pending] = useActionState(addDomain, undefined);
  return (
    <section className="panel space-y-5 p-6" aria-labelledby="domains-title">
      <div>
        <h2 id="domains-title" className="text-xl">Sending domain</h2>
        <p className="mt-1 text-sm text-muted">
          Emails are sent from a domain you own. Use a subdomain (like go.acme.com) so cold email never affects your main
          domain&apos;s reputation.
        </p>
      </div>

      {domains.map((d) => (
        <div key={d.id} className="space-y-3 rounded-[var(--radius-control)] border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold" translate="no">{d.domain}</p>
            <span className={`pill ${d.status === "verified" ? "bg-success-soft text-success" : "bg-dawn-soft text-dawn-ink"}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {d.status === "verified" ? "Verified" : `Not verified (${d.status.replace(/_/g, " ")})`}
            </span>
          </div>
          {d.status !== "verified" && d.records.length > 0 && (
            <>
              <p className="text-sm text-muted">Add these records at your DNS provider, then check verification:</p>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Type</th>
                      <th scope="col">Name</th>
                      <th scope="col">Value</th>
                      <th scope="col">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.records.map((r, i) => (
                      <tr key={i}>
                        <td>{r.type}</td>
                        <td className="font-mono text-xs [overflow-wrap:anywhere]">{r.name}</td>
                        <td className="max-w-md font-mono text-xs [overflow-wrap:anywhere]">{r.value}</td>
                        <td>{r.priority ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {d.status !== "verified" ? <CheckButton id={d.id} /> : <span className="text-sm text-muted">You can send from any address @{d.domain}.</span>}
            <form
              action={removeDomain.bind(null, d.id)}
              onSubmit={(e) => {
                if (!confirm(`Remove ${d.domain}? The agent will stop sending from it.`)) e.preventDefault();
              }}
            >
              <button className="btn-quiet !min-h-9 text-danger">Remove</button>
            </form>
          </div>
        </div>
      ))}

      <form action={action} className="space-y-2">
        <label htmlFor="domain" className="label">{domains.length ? "Add another domain" : "Domain to send from"}</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="domain"
            name="domain"
            required
            placeholder="go.acme.com…"
            autoComplete="off"
            spellCheck={false}
            className="input flex-1"
          />
          <button className="btn-secondary" disabled={pending}>{pending ? "Adding…" : "Add domain"}</button>
        </div>
        {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {state?.message && <p role="status" className="text-sm text-success">{state.message}</p>}
      </form>
    </section>
  );
}
