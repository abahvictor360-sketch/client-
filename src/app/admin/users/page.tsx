import Link from "next/link";
import { adminDate, loadUsers } from "@/lib/admin-data";
import { formatUsd, trialStatus } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Users" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const { q, filter } = await searchParams;
  const db = adminClient();
  const [{ users }, accounts, businesses] = await Promise.all([
    loadUsers(),
    db.from("accounts").select("user_id, trial_ends_at, credits_cents, is_admin, suspended"),
    db.from("businesses").select("user_id"),
  ]);
  const accountById = new Map((accounts.data ?? []).map((a) => [a.user_id, a]));
  const campaigns = new Map<string, number>();
  for (const b of businesses.data ?? []) campaigns.set(b.user_id, (campaigns.get(b.user_id) ?? 0) + 1);

  const query = (q ?? "").trim().toLowerCase();
  const rows = users
    .filter((u) => !query || (u.email ?? "").toLowerCase().includes(query))
    .filter((u) => {
      const a = accountById.get(u.id);
      if (filter === "trial") return trialStatus(a?.trial_ends_at).active;
      if (filter === "suspended") return a?.suspended;
      if (filter === "admins") return a?.is_admin;
      if (filter === "unconfirmed") return !u.email_confirmed_at;
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const filters = [
    { id: "", label: "All" },
    { id: "trial", label: "On trial" },
    { id: "suspended", label: "Suspended" },
    { id: "admins", label: "Admins" },
    { id: "unconfirmed", label: "Email not confirmed" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl">Users <span className="text-muted">({rows.length})</span></h1>
        <form className="flex gap-2" role="search">
          {filter && <input type="hidden" name="filter" value={filter} />}
          <label htmlFor="user-search" className="sr-only">Search by email</label>
          <input id="user-search" name="q" defaultValue={q} placeholder="Search by email…" autoComplete="off" className="input !min-h-10 w-64" />
          <button className="btn-secondary !min-h-10">Search</button>
        </form>
      </div>
      <nav aria-label="Filter users" className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={`/admin/users?${new URLSearchParams({ ...(f.id ? { filter: f.id } : {}), ...(q ? { q } : {}) })}`}
            aria-current={(filter ?? "") === f.id ? "page" : undefined}
            className={`pill !px-3 !py-1.5 ring-1 ring-line ${(filter ?? "") === f.id ? "bg-ink text-canvas" : "bg-surface"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <section aria-label="Users" className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Joined</th>
              <th scope="col">Trial</th>
              <th scope="col" className="!text-right">Credits</th>
              <th scope="col" className="!text-right">Campaigns</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const a = accountById.get(u.id);
              const trial = trialStatus(a?.trial_ends_at);
              return (
                <tr key={u.id}>
                  <td className="min-w-56">
                    <Link href={`/admin/users/${u.id}`} className="font-semibold underline-offset-4 hover:underline [overflow-wrap:anywhere]">
                      {u.email}
                    </Link>
                    {!u.email_confirmed_at && <p className="text-xs text-muted">Email not confirmed</p>}
                  </td>
                  <td className="whitespace-nowrap text-muted">{adminDate.format(new Date(u.created_at))}</td>
                  <td>{trial.active ? <span className="text-success">{trial.daysLeft}d left</span> : <span className="text-muted">Ended</span>}</td>
                  <td className="text-right">{formatUsd(a?.credits_cents ?? 0)}</td>
                  <td className="text-right">{campaigns.get(u.id) ?? 0}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    {a?.is_admin && <span className="pill bg-ink text-canvas">Admin</span>}
                    {a?.suspended && <span className="pill bg-surface-2 text-danger">Suspended</span>}
                    {!a?.is_admin && !a?.suspended && <span className="text-muted">Active</span>}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={6} className="!py-12 text-center text-muted">{query || filter ? "No users match." : "No one has signed up yet."}</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
