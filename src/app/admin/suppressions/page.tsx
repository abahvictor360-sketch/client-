import { adminDateTime } from "@/lib/admin-data";
import { adminClient } from "@/lib/supabase/admin";
import { removeSuppression } from "../actions";
import { ConfirmButton, SuppressionForm } from "../ui";

export const metadata = { title: "Do-not-contact" };

const REASONS: Record<string, string> = {
  unsubscribe: "Unsubscribed",
  unsubscribe_reply: "Asked to stop by reply",
  bounce: "Email bounced",
  complaint: "Marked as spam",
  admin: "Added by admin",
};

export default async function AdminSuppressions({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  let query = adminClient().from("suppressions").select("*").order("created_at", { ascending: false }).limit(500);
  if (q?.trim()) query = query.ilike("email", `%${q.trim().replace(/[%_]/g, "")}%`);
  const { data } = await query;
  const rows = data ?? [];
  return (
    <>
      <div>
        <h1 className="text-3xl sm:text-4xl">Do-not-contact list</h1>
        <p className="mt-2 text-muted">No campaign will ever email these addresses.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SuppressionForm />
        <form className="flex gap-2" role="search">
          <label htmlFor="sup-search" className="sr-only">Search</label>
          <input id="sup-search" name="q" defaultValue={q} placeholder="Search…" autoComplete="off" className="input !min-h-10 w-56" />
          <button className="btn-secondary !min-h-10">Search</button>
        </form>
      </div>
      <section aria-label="Do-not-contact list" className="panel overflow-x-auto">
        <table className="data-table">
          <thead><tr><th scope="col">Email</th><th scope="col">Reason</th><th scope="col">Added</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email}>
                <td className="[overflow-wrap:anywhere]">{r.email}</td>
                <td>{REASONS[r.reason] ?? r.reason}</td>
                <td className="whitespace-nowrap text-muted">{adminDateTime.format(new Date(r.created_at))}</td>
                <td className="text-right">
                  {r.reason === "admin" && (
                    <ConfirmButton action={removeSuppression.bind(null, r.email)} label="Remove" confirmText={`Allow emailing ${r.email} again?`} />
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="!py-12 text-center text-muted">The list is empty.</td></tr>}
          </tbody>
        </table>
      </section>
      <p className="text-sm text-muted">
        People who unsubscribed, bounced or complained can&apos;t be removed here: emailing them again could break anti-spam law.
      </p>
    </>
  );
}
