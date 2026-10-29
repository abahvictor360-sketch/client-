import { ArrowRight, Settings2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { formatUsd, PRICE_PER_EMAIL_CENTS, trialStatus } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import { AutoRefresh, RunControls } from "./controls";
import { DailyChart } from "./daily-chart";
import { analysisStalled, businessLabel, getAccount, getBusiness, getSegments, hostOf } from "./data";
import { LaunchedDialog } from "./launched-dialog";
import { setupHref } from "./setup/steps";

export const maxDuration = 300;
export const metadata = { title: "Dashboard" };

const RANGES = [7, 30] as const;
const LIVE = ["testing", "working", "scaling"];

export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; p?: string; range?: string; launched?: string }>;
}) {
  const { id } = await params;
  const { tab, p, range: rawRange, launched } = await searchParams;

  // Links from before the sidebar (notification emails, bookmarks).
  if (tab === "inbox") redirect(`/app/b/${id}/inbox${p ? `?p=${p}` : ""}`);
  if (tab === "prospects") redirect(`/app/b/${id}/people`);
  if (tab === "meetings") redirect(`/app/b/${id}/meetings`);
  if (tab === "overview") redirect(`/app/b/${id}/targeting`);

  const [business, segments, account] = await Promise.all([getBusiness(id), getSegments(id), getAccount()]);
  if (business.status === "ready" && !business.confirmed_at) redirect(setupHref(id, "company"));

  const range = RANGES.find((r) => String(r) === rawRange) ?? 7;
  const { supabase } = await requireUser();
  const [{ data: daily }, { count: hotLeads }, { count: upcoming }] = await Promise.all([
    supabase.rpc("message_daily", { p_business_id: id, p_days: range, p_tz: account?.timezone ?? "UTC" }),
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("business_id", id).in("status", ["interested", "booked"]),
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", id)
      .eq("status", "booked")
      .gte("starts_at", new Date().toISOString()),
  ]);
  const days = (daily ?? []) as { day: string; sent: number; replies: number }[];

  const host = hostOf(business);
  const stalled = analysisStalled(business);
  const status = stalled ? "failed" : business.status;
  const trial = trialStatus(account?.trial_ends_at);
  const totals = segments.reduce(
    (t, s) => ({ sent: t.sent + s.sent, replies: t.replies + s.replies, warm: t.warm + s.positive_replies, meetings: t.meetings + s.meetings, spend: t.spend + s.spend_cents }),
    { sent: 0, replies: 0, warm: 0, meetings: 0, spend: 0 },
  );
  const sentToday = Number(days.at(-1)?.sent ?? 0);
  const spentToday = trial.active ? 0 : sentToday * PRICE_PER_EMAIL_CENTS;
  const budgetUsed = business.daily_budget_cents ? Math.min(1, spentToday / business.daily_budget_cents) : 0;
  const focus = segments.find((s) => LIVE.includes(s.status));

  return (
    <div className="space-y-6">
      <AutoRefresh active={business.status === "analyzing" && !stalled} />
      {launched && <LaunchedDialog />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl">{businessLabel(business)}</h1>
            <StatusPill status={status} />
          </div>
          {host && (
            <a href={business.website!} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-muted underline underline-offset-4" translate="no">
              {host}
            </a>
          )}
        </div>
        <RunControls id={id} status={status} />
      </div>

      {/* What the agent is doing right now. */}
      <section aria-label="Status" className="panel flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
              status === "running" || status === "analyzing" ? "animate-pulse bg-teal motion-reduce:animate-none" : status === "failed" ? "bg-danger" : "bg-muted/50"
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            {status === "analyzing" && (
              <>
                <p className="text-lg font-semibold">{host ? `Reading ${host} and researching competitors` : "Studying your description and researching competitors"}</p>
                <p className="text-sm text-muted">This usually takes one to two minutes. The page updates by itself.</p>
              </>
            )}
            {status === "failed" && (
              <>
                <p className="text-lg font-semibold text-danger">{stalled ? "The analysis took too long and stopped" : "The analysis didn’t finish"}</p>
                <p className="text-sm text-muted">{stalled ? "Choose Analyze again to retry." : business.error}</p>
              </>
            )}
            {status === "ready" && (
              <>
                <p className="text-lg font-semibold">Your campaign is ready</p>
                <p className="text-sm text-muted">Nothing is sent until you start the agent.</p>
              </>
            )}
            {status === "running" && (
              <>
                <p className="text-lg font-semibold">The agent is working</p>
                <p className="text-sm text-muted">
                  {focus ? <>Finding people for <span className="font-medium text-ink">{focus.name}</span> and emailing them</> : "Every buyer type is paused, so nothing is being sent"}
                  {" "}on weekdays, 8:00–18:00 ({account?.timezone ?? "UTC"}).
                </p>
              </>
            )}
            {status === "paused" && (
              <>
                <p className="text-lg font-semibold">Paused</p>
                <p className="text-sm text-muted">Nothing is being sent. Conversations already underway still get answered.</p>
              </>
            )}
          </div>
        </div>
        {status === "running" && <Link href={`/app/b/${id}/sent`} className="btn-primary">View emails</Link>}
        {status === "ready" && <Link href={setupHref(id, "launch")} className="btn-secondary">Review setup</Link>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="budget-title" className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 id="budget-title" className="text-lg">Daily budget</h2>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${formatUsd(spentToday)} of ${formatUsd(business.daily_budget_cents)} spent today`}>
                <div className="h-full rounded-full bg-teal" style={{ width: `${Math.max(budgetUsed * 100, budgetUsed ? 4 : 0)}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted">
                {status === "running"
                  ? `${formatUsd(spentToday)} spent today · up to ${business.max_emails_per_day} emails a day`
                  : "Budget unused while the campaign isn’t running"}
              </p>
            </div>
            <p className="text-3xl font-semibold tabular-nums">{formatUsd(business.daily_budget_cents)}</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="pill bg-surface-2 text-muted">
              {trial.active ? `Free trial: ${trial.daysLeft} ${trial.daysLeft === 1 ? "day" : "days"} left` : `Balance ${formatUsd(account?.credits_cents ?? 0)}`}
            </span>
            <div className="flex gap-2">
              <Link href={`/app/b/${id}/schedule`} className="btn-secondary !min-h-10 !px-3" aria-label="Budget and schedule settings">
                <Settings2 size={16} aria-hidden="true" />
              </Link>
              <Link href="/app/billing" className="btn-secondary !min-h-10">Top up</Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="leads-title" className="panel flex flex-col justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="leads-title" className="text-lg">Hot leads</h2>
              <p className="mt-1 text-sm text-muted">
                People who said they&apos;re interested or booked a call.{" "}
                {upcoming ? `${upcoming} upcoming ${upcoming === 1 ? "meeting" : "meetings"}.` : ""}
              </p>
            </div>
            <p className="text-3xl font-semibold tabular-nums">{hotLeads ?? 0}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/app/b/${id}/inbox`} className="btn-primary !min-h-10">
              Open inbox <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href={`/app/b/${id}/meetings`} className="btn-secondary !min-h-10">Meetings</Link>
          </div>
        </section>
      </div>

      <section aria-labelledby="performance-title" className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="performance-title" className="eyebrow !text-xs">Performance</h2>
          <nav aria-label="Time range" className="flex rounded-[12px] bg-surface p-1 ring-1 ring-line">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/app/b/${id}?range=${r}`}
                scroll={false}
                aria-current={r === range ? "true" : undefined}
                className={`rounded-[9px] px-3 py-1.5 text-sm ${r === range ? "bg-surface-2 font-semibold" : "text-muted hover:text-ink"}`}
              >
                {r}d
              </Link>
            ))}
          </nav>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <DailyChart title="Emails sent" unit="sent" total={days.reduce((s, d) => s + Number(d.sent), 0)} days={days.map((d) => ({ day: d.day, value: Number(d.sent) }))} />
          <DailyChart title="Replies" unit="replies" total={days.reduce((s, d) => s + Number(d.replies), 0)} days={days.map((d) => ({ day: d.day, value: Number(d.replies) }))} />
        </div>
        <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] bg-line ring-1 ring-line [gap:1px] sm:grid-cols-5 [&>:last-child]:col-span-2 sm:[&>:last-child]:col-span-1">
          {[
            { label: "Emails sent (all time)", value: totals.sent.toLocaleString("en-US") },
            { label: "Replies", value: totals.replies.toLocaleString("en-US") },
            { label: "Warm leads", value: totals.warm.toLocaleString("en-US") },
            { label: "Meetings booked", value: totals.meetings.toLocaleString("en-US") },
            { label: "Cost per warm lead", value: totals.warm ? formatUsd(totals.spend / totals.warm) : "–" },
          ].map((s) => (
            <div key={s.label} className="bg-surface p-4">
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {segments.length > 0 && (
        <section aria-labelledby="buyers-title" className="panel overflow-x-auto">
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <h2 id="buyers-title" className="text-lg">Buyer types</h2>
            <Link href={`/app/b/${id}/targeting`} className="btn-quiet !min-h-9">Manage</Link>
          </div>
          <table className="data-table mt-2">
            <thead>
              <tr>
                <th scope="col">Buyer type</th>
                <th scope="col">Status</th>
                <th scope="col" className="!text-right">Sent</th>
                <th scope="col" className="!text-right">Replies</th>
                <th scope="col" className="!text-right">Warm</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/app/b/${id}/targeting/${s.id}`} className="font-medium underline-offset-4 hover:underline">{s.name}</Link></td>
                  <td><StatusPill status={s.status} /></td>
                  <td className="text-right">{s.sent}</td>
                  <td className="text-right">{s.replies}</td>
                  <td className="text-right">{s.positive_replies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
