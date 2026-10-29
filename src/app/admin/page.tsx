import Link from "next/link";
import { DailyChart } from "@/app/app/b/[id]/daily-chart";
import { adminDateTime, configStatus, loadSetupProgress, loadUsers, SETUP_STEPS } from "@/lib/admin-data";
import { formatUsd, trialStatus } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";
import { RunAgentButton } from "./ui";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const db = adminClient();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ users, emailById }, accounts, businesses, revenue, sentAll, sentDay, replies, meetings, runs, progress, daily] = await Promise.all([
    loadUsers(),
    db.from("accounts").select("user_id, trial_ends_at, credits_cents, suspended, heard_from"),
    db.from("businesses").select("id, user_id, name, website, status, error, analysis_started_at"),
    db.from("credit_ledger").select("user_id, amount_cents, created_at").eq("reason", "top_up"),
    db.from("messages").select("id", { count: "exact", head: true }).eq("direction", "outbound"),
    db.from("messages").select("id", { count: "exact", head: true }).eq("direction", "outbound").gte("created_at", dayAgo),
    db.from("messages").select("id", { count: "exact", head: true }).eq("direction", "inbound"),
    db.from("meetings").select("id", { count: "exact", head: true }).eq("status", "booked"),
    db.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(10),
    loadSetupProgress(),
    db.rpc("admin_message_daily", { p_days: 30 }),
  ]);
  const days = ((daily.data ?? []) as { day: string; sent: number; replies: number }[]).map((d) => ({ day: d.day, sent: Number(d.sent), replies: Number(d.replies) }));
  const funnel = [
    { label: "Signed up", count: users.length },
    ...SETUP_STEPS.map((step) => ({ label: step.label, count: [...progress.values()].filter((p) => p[step.key]).length })),
  ];
  const sources = new Map<string, number>();
  for (const a of accounts.data ?? []) sources.set(a.heard_from ?? "Not answered", (sources.get(a.heard_from ?? "Not answered") ?? 0) + 1);
  const sourceRows = [...sources.entries()].sort((a, b) => b[1] - a[1]);

  const accs = accounts.data ?? [];
  const biz = businesses.data ?? [];
  const payments = revenue.data ?? [];
  const config = configStatus();
  const missingRequired = config.filter((c) => c.required && !c.ok);
  const lastRun = runs.data?.[0];
  const lastRunAgeMin = lastRun ? Math.round((Date.now() - new Date(lastRun.started_at).getTime()) / 60_000) : null;

  const failed = biz.filter((b) => b.status === "failed");
  const stalled = biz.filter(
    (b) => b.status === "analyzing" && Date.now() - new Date(b.analysis_started_at).getTime() > 6 * 60_000,
  );

  const stats = [
    { label: "Users", value: users.length, sub: `${users.filter((u) => u.created_at >= weekAgo).length} this week` },
    { label: "On free trial", value: accs.filter((a) => trialStatus(a.trial_ends_at).active).length },
    { label: "Paying users", value: new Set(payments.map((p) => p.user_id)).size },
    { label: "Campaigns running", value: biz.filter((b) => b.status === "running").length, sub: `${biz.length} total` },
    { label: "Emails sent (24h)", value: sentDay.count ?? 0, sub: `${sentAll.count ?? 0} all time` },
    { label: "Replies received", value: replies.count ?? 0 },
    { label: "Meetings booked", value: meetings.count ?? 0 },
    {
      label: "Revenue",
      value: formatUsd(payments.reduce((s, p) => s + p.amount_cents, 0)),
      sub: `${formatUsd(payments.filter((p) => p.created_at >= weekAgo).reduce((s, p) => s + p.amount_cents, 0))} this week`,
    },
  ];

  return (
    <>
      <div>
        <h1 className="text-3xl sm:text-4xl">Overview</h1>
        <p className="mt-2 text-muted">All times are UTC.</p>
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line [gap:1px] sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface p-4">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
            {s.sub && <dd className="text-xs text-muted">{s.sub}</dd>}
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <DailyChart title="Emails sent, all users (30 days)" unit="sent" total={days.reduce((t, d) => t + d.sent, 0)} days={days.map((d) => ({ day: d.day, value: d.sent }))} />
        <DailyChart title="Replies, all users (30 days)" unit="replies" total={days.reduce((t, d) => t + d.replies, 0)} days={days.map((d) => ({ day: d.day, value: d.replies }))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <section aria-labelledby="funnel-title" className="panel p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="funnel-title" className="text-xl">Onboarding funnel</h2>
            <Link href="/admin/users?filter=stuck" className="text-sm underline underline-offset-4">Users not launched yet</Link>
          </div>
          <p className="mt-1 text-sm text-muted">How many users reached each step of the Get started checklist.</p>
          <ol className="mt-4 space-y-2.5">
            {funnel.map((f) => (
              <li key={f.label} className="grid grid-cols-[8.5rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="text-muted">{f.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                  <span className="block h-full rounded-full bg-teal" style={{ width: `${funnel[0].count ? Math.max(f.count ? 2 : 0, (f.count / funnel[0].count) * 100) : 0}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{f.count}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="sources-title" className="panel p-6">
          <h2 id="sources-title" className="text-xl">How users found us</h2>
          <p className="mt-1 text-sm text-muted">From the &ldquo;How did you hear about us?&rdquo; setup step.</p>
          <ol className="mt-4 space-y-2.5">
            {sourceRows.map(([label, count]) => (
              <li key={label} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-sm">
                <span className={label === "Not answered" ? "text-muted" : ""}>{label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                  <span className={`block h-full rounded-full ${label === "Not answered" ? "bg-muted/40" : "bg-teal"}`} style={{ width: `${(count / Math.max(1, accounts.data?.length ?? 1)) * 100}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{count}</span>
              </li>
            ))}
            {!sourceRows.length && <li className="text-sm text-muted">No users yet.</li>}
          </ol>
        </section>
      </div>

      {(missingRequired.length > 0 || failed.length > 0 || stalled.length > 0 || (lastRunAgeMin !== null && lastRunAgeMin > 30)) && (
        <section aria-labelledby="attention-title" className="panel space-y-3 border-danger/30 p-6">
          <h2 id="attention-title" className="text-xl">Needs attention</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {missingRequired.map((c) => (
              <li key={c.name}><span className="font-semibold">{c.name}</span> is not configured in Vercel.</li>
            ))}
            {lastRunAgeMin !== null && lastRunAgeMin > 30 && (
              <li>The agent last ran {lastRunAgeMin} minutes ago. Check the GitHub schedule (APP_URL and CRON_SECRET secrets).</li>
            )}
            {failed.map((b) => (
              <li key={b.id}>
                Analysis failed for{" "}
                <Link className="underline" href={`/admin/campaigns/${b.id}`}>{b.name ?? b.website ?? "a campaign"}</Link>{" "}
                ({emailById.get(b.user_id)}): {b.error}
              </li>
            ))}
            {stalled.map((b) => (
              <li key={b.id}>
                Analysis stalled for <Link className="underline" href={`/admin/campaigns/${b.id}`}>{b.website ?? "a campaign"}</Link>.
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <section aria-labelledby="system-title" className="panel p-6">
          <h2 id="system-title" className="text-xl">System status</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {config.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3">
                <span>{c.name}{!c.required && <span className="text-muted"> (optional)</span>}</span>
                <span className={`pill ${c.ok ? "bg-success-soft text-success" : c.required ? "bg-surface-2 text-danger" : "bg-surface-2 text-muted"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  {c.ok ? "Configured" : "Not set"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="runs-title" className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="runs-title" className="text-xl">Agent runs</h2>
            <RunAgentButton />
          </div>
          <p className="mt-2 text-sm text-muted">
            {lastRun
              ? `Last run ${adminDateTime.format(new Date(lastRun.started_at))} (${lastRunAgeMin} min ago).`
              : "The agent hasn't run yet."}{" "}
            It sends only on weekdays, 08:00–18:00 in each user&apos;s timezone.
          </p>
          <div className="-mx-6 mt-4 overflow-x-auto px-2">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Started</th>
                <th scope="col">By</th>
                <th scope="col" className="!text-right">Campaigns</th>
                <th scope="col" className="!text-right">Sent</th>
                <th scope="col" className="!text-right">Errors</th>
              </tr>
            </thead>
            <tbody>
              {(runs.data ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{adminDateTime.format(new Date(r.started_at))}</td>
                  <td>{r.trigger === "admin" ? "Admin" : "Schedule"}</td>
                  <td className="text-right">{r.businesses}</td>
                  <td className="text-right">{r.sent}</td>
                  <td className={`text-right ${(r.errors as unknown[]).length ? "text-danger" : ""}`} title={JSON.stringify(r.errors)}>
                    {r.finished_at ? (r.errors as unknown[]).length : "running…"}
                  </td>
                </tr>
              ))}
              {!runs.data?.length && (
                <tr><td colSpan={5} className="!py-8 text-center text-muted">No runs yet.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </section>
      </div>
    </>
  );
}
