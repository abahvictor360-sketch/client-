import { adminDateTime, loadUsers } from "@/lib/admin-data";
import { adminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Audit log" };

const LABELS: Record<string, string> = {
  "credits.add": "Added credits",
  "credits.remove": "Removed credits",
  "trial.extend": "Extended trial",
  "trial.end": "Ended trial",
  "user.suspend": "Suspended user",
  "user.unsuspend": "Unsuspended user",
  "user.make_admin": "Made admin",
  "user.remove_admin": "Removed admin",
  "user.delete": "Deleted user",
  "campaign.pause": "Paused campaign",
  "campaign.resume": "Resumed campaign",
  "campaign.reanalyze": "Re-ran analysis",
  "campaign.delete": "Deleted campaign",
  "agent.run_now": "Ran agent manually",
  "suppression.add": "Added to do-not-contact",
  "suppression.remove": "Removed from do-not-contact",
  "domain.remove": "Removed sending domain",
};

export default async function AdminAudit() {
  const [{ emailById }, log] = await Promise.all([
    loadUsers(),
    adminClient().from("admin_actions").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  const rows = log.data ?? [];
  return (
    <>
      <div>
        <h1 className="text-3xl sm:text-4xl">Audit log</h1>
        <p className="mt-2 text-muted">Every change made from the admin dashboard, newest first.</p>
      </div>
      <section aria-label="Audit log" className="panel overflow-x-auto">
        <table className="data-table">
          <thead><tr><th scope="col">When</th><th scope="col">Admin</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-muted">{adminDateTime.format(new Date(r.created_at))}</td>
                <td className="[overflow-wrap:anywhere]">{r.admin_id ? emailById.get(r.admin_id) ?? "(deleted)" : "–"}</td>
                <td>{LABELS[r.action] ?? r.action}</td>
                <td className="max-w-48 [overflow-wrap:anywhere] text-muted">{(r.target && emailById.get(r.target)) || r.target || "–"}</td>
                <td className="max-w-64 [overflow-wrap:anywhere] text-xs text-muted">
                  {Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : "–"}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="!py-12 text-center text-muted">No admin actions yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
