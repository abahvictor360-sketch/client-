import { requireUser } from "@/lib/supabase/server";
import { addOwnSuppression, removeOwnSuppression } from "../actions";
import { ActionForm } from "../b/[id]/action-form";
import { PageHeader } from "../b/[id]/page-header";

export const metadata = { title: "Suppress list" };

const added = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function SuppressPage() {
  const { supabase } = await requireUser();
  const { data: rows, count } = await supabase
    .from("user_suppressions")
    .select("id, value, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Suppress list"
        description="People and companies the agent must never email: existing customers, partners, competitors. Applies to all your businesses. Anyone who unsubscribes is blocked automatically."
      />
      <section className="panel p-5 sm:p-6">
        <ActionForm action={addOwnSuppression} submitLabel="Add to list" pendingLabel="Adding…">
          <div>
            <label htmlFor="values" className="label">Email addresses or domains</label>
            <textarea id="values" name="values" rows={4} required spellCheck={false} className="input min-h-28 py-2.5 font-mono text-sm"
              placeholder={"ceo@bigclient.com\nexistingcustomer.com\npartner.co"} aria-describedby="values-hint" />
            <p id="values-hint" className="hint">One per line, or separated by commas. A domain blocks everyone at that company. Paste up to 500 at once.</p>
          </div>
        </ActionForm>
      </section>
      <section aria-labelledby="list-title" className="panel overflow-x-auto">
        <h2 id="list-title" className="px-5 pt-5 text-lg">Blocked {count ? <span className="text-muted">({count.toLocaleString("en-US")})</span> : null}</h2>
        {rows?.length ? (
          <table className="data-table mt-2">
            <thead>
              <tr><th scope="col">Email or domain</th><th scope="col">Added</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono [overflow-wrap:anywhere]" translate="no">{r.value}</td>
                  <td className="whitespace-nowrap text-muted">{added.format(new Date(r.created_at))}</td>
                  <td className="text-right">
                    <form action={removeOwnSuppression.bind(null, r.id)}>
                      <button className="btn-quiet !min-h-9" aria-label={`Remove ${r.value}`}>Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 pb-6 pt-2 text-sm text-muted">Nothing blocked yet.</p>
        )}
      </section>
    </div>
  );
}
