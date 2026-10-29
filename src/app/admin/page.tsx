import Link from "next/link";
import { Logo } from "@/components/logo";
import { StatusPill } from "@/components/status-pill";
import { requireAdmin } from "@/lib/admin";
import { formatUsd, trialStatus } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";
import type { Account, Business, Segment } from "@/lib/types";
import { endTrial, extendTrial, setAdmin, setCampaignPaused } from "./actions";
import { GrantCreditsForm } from "./grant-credits-form";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "users", label: "Users" },
  { id: "campaigns", label: "Campaigns" },
  { id: "payments", label: "Payments" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

async function loadData() {
  const db = adminClient();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

  const [usersRes, accounts, businesses, segments, ledger, sentAll, sentDay, meetings] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("accounts").select("*").returns<(Account & { is_admin: boolean; created_at: string })[]>(),
    db.from("businesses").select("*").order("created_at", { ascending: false }).returns<Business[]>(),
    db.from("segments").select("business_id, sent, positive_replies, meetings").returns<Pick<Segment, "business_id" | "sent" | "positive_replies" | "meetings">[]>(),
    db
      .from("credit_ledger")
      .select("id, user_id, amount_cents, reason, ref, created_at")
      .in("reason", ["top_up", "admin_grant", "admin_deduct"])
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("messages").select("id", { count: "exact", head: true }).eq("direction", "outbound"),
    db.from("messages").select("id", { count: "exact", head: true }).eq("direction", "outbound").gte("created_at", dayAgo),
    db.from("meetings").select("id", { count: "exact", head: true }).eq("status", "booked"),
  ]);

  const users = usersRes.data?.users ?? [];
  const emailById = new Map(users.map((u) => [u.id, u.email ?? "(no email)"]));
  const accountById = new Map((accounts.data ?? []).map((a) => [a.user_id, a]));

  const byBusiness = new Map<string, { sent: number; warm: number; meetings: number }>();
  for (const s of segments.data ?? []) {
    const t = byBusiness.get(s.business_id) ?? { sent: 0, warm: 0, meetings: 0 };
    t.sent += s.sent;
    t.warm += s.positive_replies;
    t.meetings += s.meetings;
    byBusiness.set(s.business_id, t);
  }
  const campaignsByUser = new Map<string, number>();
  for (const b of businesses.data ?? []) campaignsByUser.set(b.user_id, (campaignsByUser.get(b.user_id) ?? 0) + 1);

  return {
    users,
    emailById,
    accountById,
    businesses: businesses.data ?? [],
    byBusiness,
    campaignsByUser,
    ledger: ledger.data ?? [],
    totals: {
      users: users.length,
      onTrial: (accounts.data ?? []).filter((a) => trialStatus(a.trial_ends_at).active).length,
      running: (businesses.data ?? []).filter((b) => b.status === "running").length,
      sentAll: sentAll.count ?? 0,
      sentDay: sentDay.count ?? 0,
      meetings: meetings.count ?? 0,
      revenue: (ledger.data ?? []).filter((l) => l.reason === "top_up").reduce((sum, l) => sum + l.amount_cents, 0),
    },
  };
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const me = await requireAdmin();
  const { tab: rawTab, q } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "users";
  const data = await loadData();
  const query = (q ?? "").trim().toLowerCase();

  const stats = [
    { label: "Users", value: data.totals.users },
    { label: "On free trial", value: data.totals.onTrial },
    { label: "Campaigns running", value: data.totals.running },
    { label: "Emails sent (24h)", value: data.totals.sentDay },
    { label: "Emails sent (all)", value: data.totals.sentAll },
    { label: "Meetings booked", value: data.totals.meetings },
    { label: "Revenue", value: formatUsd(data.totals.revenue) },
  ];

  const users = data.users
    .filter((u) => !query || (u.email ?? "").toLowerCase().includes(query))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const campaigns = data.businesses.filter((b) => {
    if (!query) return true;
    const hay = `${b.name ?? ""} ${b.website ?? ""} ${data.emailById.get(b.user_id) ?? ""}`.toLowerCase();
    return hay.includes(query);
  });

  return (
    <div className="min-h-dvh p-3">
      <div className="frame">
        <header className="relative z-20 flex justify-center px-3 pt-4 sm:pt-6">
          <div className="flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 rounded-2xl bg-surface py-0.5 pl-4 pr-1.5 shadow-[var(--shadow-float)] ring-1 ring-line">
            <div className="flex items-center gap-2">
              <Logo href="/admin" />
              <span className="pill bg-ink text-canvas">Admin</span>
            </div>
            <nav aria-label="Admin" className="flex items-center gap-1 text-sm">
              <Link href="/app" className="btn-quiet">Back to app</Link>
            </nav>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:py-12">
          <div>
            <h1 className="text-3xl sm:text-4xl">Admin</h1>
            <p className="mt-2 text-muted">Signed in as {me.email}. Times are UTC.</p>
          </div>

          <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line [gap:1px] sm:grid-cols-4 lg:grid-cols-7">
            {stats.map((s) => (
              <div key={s.label} className="bg-surface p-4">
                <dt className="text-sm text-muted">{s.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <nav aria-label="Admin sections" className="-mx-1 overflow-x-auto">
              <ul className="flex gap-1 border-b border-line">
                {TABS.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/admin?tab=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                      aria-current={t.id === tab ? "page" : undefined}
                      className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm ${
                        t.id === tab ? "border-ink font-semibold" : "border-transparent text-muted hover:text-ink"
                      }`}
                    >
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {tab !== "payments" && (
              <form className="flex gap-2" role="search">
                <input type="hidden" name="tab" value={tab} />
                <label htmlFor="admin-search" className="sr-only">Search</label>
                <input
                  id="admin-search"
                  name="q"
                  defaultValue={q}
                  placeholder={tab === "users" ? "Search by email…" : "Search campaigns or owners…"}
                  autoComplete="off"
                  className="input !min-h-10 w-64"
                />
                <button className="btn-secondary !min-h-10">Search</button>
              </form>
            )}
          </div>

          {tab === "users" && (
            <section aria-label="Users" className="panel overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Trial</th>
                    <th scope="col" className="!text-right">Credits</th>
                    <th scope="col" className="!text-right">Campaigns</th>
                    <th scope="col">Add / remove credits (USD)</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const account = data.accountById.get(u.id);
                    const trial = trialStatus(account?.trial_ends_at);
                    return (
                      <tr key={u.id}>
                        <td className="min-w-56">
                          <p className="font-semibold [overflow-wrap:anywhere]">
                            {u.email}
                            {account?.is_admin && <span className="pill ml-2 bg-ink text-canvas">Admin</span>}
                          </p>
                          <p className="text-muted">
                            Joined {date.format(new Date(u.created_at))}
                            {!u.email_confirmed_at && " · email not confirmed"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap">
                          {trial.active ? (
                            <span className="text-success">{trial.daysLeft}d left</span>
                          ) : (
                            <span className="text-muted">Ended</span>
                          )}
                        </td>
                        <td className="text-right">{formatUsd(account?.credits_cents ?? 0)}</td>
                        <td className="text-right">{data.campaignsByUser.get(u.id) ?? 0}</td>
                        <td>
                          <GrantCreditsForm userId={u.id} email={u.email ?? ""} />
                        </td>
                        <td>
                          <div className="flex flex-wrap justify-end gap-1">
                            <form action={extendTrial.bind(null, u.id, 3)}>
                              <button className="btn-quiet !min-h-9">+3 days trial</button>
                            </form>
                            {trial.active && (
                              <form action={endTrial.bind(null, u.id)}>
                                <button className="btn-quiet !min-h-9">End trial</button>
                              </form>
                            )}
                            {u.id !== me.id && (
                              <form action={setAdmin.bind(null, u.id, !account?.is_admin)}>
                                <button className="btn-quiet !min-h-9">{account?.is_admin ? "Remove admin" : "Make admin"}</button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!users.length && (
                    <tr>
                      <td colSpan={6} className="!py-12 text-center text-muted">
                        {query ? "No users match that search." : "No one has signed up yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {tab === "campaigns" && (
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
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((b) => {
                    const t = data.byBusiness.get(b.id) ?? { sent: 0, warm: 0, meetings: 0 };
                    return (
                      <tr key={b.id}>
                        <td className="min-w-56">
                          <p className="font-semibold">{b.name ?? (b.website ? new URL(b.website).hostname : "Untitled")}</p>
                          <p className="max-w-xs truncate text-muted">{b.website ?? b.description}</p>
                          {b.error && <p className="max-w-xs text-xs text-danger">{b.error}</p>}
                        </td>
                        <td className="[overflow-wrap:anywhere]">{data.emailById.get(b.user_id)}</td>
                        <td><StatusPill status={b.status} /></td>
                        <td className="text-right">{t.sent}</td>
                        <td className="text-right">{t.warm}</td>
                        <td className="text-right">{t.meetings}</td>
                        <td className="text-right">
                          {b.status === "running" && (
                            <form action={setCampaignPaused.bind(null, b.id, true)}>
                              <button className="btn-quiet !min-h-9">Pause</button>
                            </form>
                          )}
                          {b.status === "paused" && (
                            <form action={setCampaignPaused.bind(null, b.id, false)}>
                              <button className="btn-quiet !min-h-9">Resume</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!campaigns.length && (
                    <tr>
                      <td colSpan={7} className="!py-12 text-center text-muted">
                        {query ? "No campaigns match that search." : "No campaigns yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {tab === "payments" && (
            <section aria-label="Payments and credit adjustments" className="panel overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">User</th>
                    <th scope="col">Type</th>
                    <th scope="col">Reference</th>
                    <th scope="col" className="!text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap text-muted">{dateTime.format(new Date(l.created_at))}</td>
                      <td className="[overflow-wrap:anywhere]">{data.emailById.get(l.user_id)}</td>
                      <td>
                        {l.reason === "top_up"
                          ? l.ref?.startsWith("flw_")
                            ? "Flutterwave payment"
                            : "Stripe payment"
                          : l.reason === "admin_grant"
                            ? "Added by admin"
                            : "Removed by admin"}
                      </td>
                      <td className="max-w-48 truncate text-muted">{l.ref}</td>
                      <td className={`text-right ${l.amount_cents > 0 ? "text-success" : ""}`}>
                        {l.amount_cents > 0 ? "+" : "−"}
                        {formatUsd(Math.abs(l.amount_cents))}
                      </td>
                    </tr>
                  ))}
                  {!data.ledger.length && (
                    <tr>
                      <td colSpan={5} className="!py-12 text-center text-muted">No payments yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
