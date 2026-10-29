import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { adminDate, loadUsers } from "@/lib/admin-data";
import { adminClient } from "@/lib/supabase/admin";
import type { Business, Segment } from "@/lib/types";

export const metadata = { title: "Campaigns" };

export default async function AdminCampaigns({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const db = adminClient();
  const [{ emailById }, businesses, segments] = await Promise.all([
    loadUsers(),
    db.from("businesses").select("*").order("created_at", { ascending: false }).returns<Business[]>(),
    db.from("segments").select("business_id, sent, positive_replies, meetings, spend_cents").returns<Segment[]>(),
  ]);
  const totals = new Map<string, { sent: number; warm: number; meetings: number }>();
  for (const s of segments.data ?? []) {
    const t = totals.get(s.business_id) ?? { sent: 0, warm: 0, meetings: 0 };
    t.sent += s.sent;
    t.warm += s.positive_replies;
    t.meetings += s.meetings;
    totals.set(s.business_id, t);
  }
  const query = (q ?? "").trim().toLowerCase();
  const rows = (businesses.data ?? [])
    .filter((b) => !status || b.status === status)
    .filter((b) => !query || `${b.name ?? ""} ${b.website ?? ""} ${emailById.get(b.user_id) ?? ""}`.toLowerCase().includes(query));
  const statuses = ["", "running", "ready", "analyzing", "paused", "failed"];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl">Campaigns <span className="text-muted">({rows.length})</span></h1>
        <form className="flex gap-2" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="campaign-search" className="sr-only">Search campaigns</label>
          <input id="campaign-search" name="q" defaultValue={q} placeholder="Search name, site or owner…" autoComplete="off" className="input !min-h-10 w-64" />
          <button className="btn-secondary !min-h-10">Search</button>
        </form>
      </div>
      <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
        {statuses.map((s) => (
          <Link
            key={s || "all"}
            href={`/admin/campaigns?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) })}`}
            aria-current={(status ?? "") === s ? "page" : undefined}
            className={`pill !px-3 !py-1.5 capitalize ring-1 ring-line ${(status ?? "") === s ? "bg-ink text-canvas" : "bg-surface"}`}
          >
            {s || "All"}
          </Link>
        ))}
      </nav>
      <section aria-label="Campaigns" className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Campaign</th>
              <th scope="col">Owner</th>
              <th scope="col">Status</th>
              <th scope="col" className="!text-right">Sent</th>
              <th scope="col" className="!text-right">Warm</th>
              <th scope="col" className="!text-right">Meetings</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const t = totals.get(b.id) ?? { sent: 0, warm: 0, meetings: 0 };
              return (
                <tr key={b.id}>
                  <td className="min-w-56">
                    <Link href={`/admin/campaigns/${b.id}`} className="font-semibold underline-offset-4 hover:underline">
                      {b.name ?? (b.website ? new URL(b.website).hostname : "Untitled")}
                    </Link>
                    <p className="max-w-xs truncate text-muted">{b.website ?? b.description}</p>
                  </td>
                  <td><Link href={`/admin/users/${b.user_id}`} className="underline-offset-4 hover:underline [overflow-wrap:anywhere]">{emailById.get(b.user_id)}</Link></td>
                  <td><StatusPill status={b.status} /></td>
                  <td className="text-right">{t.sent}</td>
                  <td className="text-right">{t.warm}</td>
                  <td className="text-right">{t.meetings}</td>
                  <td className="whitespace-nowrap text-muted">{adminDate.format(new Date(b.created_at))}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={7} className="!py-12 text-center text-muted">No campaigns match.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
