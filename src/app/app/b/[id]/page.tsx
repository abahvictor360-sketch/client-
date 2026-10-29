import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { formatUsd } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import type { Business, Meeting, Message, Prospect, Segment } from "@/lib/types";
import { setSegmentStatus, updateBusinessLimits } from "../../actions";
import { AutoRefresh, RunControls } from "./controls";

export const maxDuration = 300;

const TABS = [
  { id: "overview", label: "Buyer types" },
  { id: "prospects", label: "People" },
  { id: "inbox", label: "Conversations" },
  { id: "meetings", label: "Meetings" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function personName(p: Pick<Prospect, "first_name" | "last_name" | "email">) {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email;
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="!py-12 text-center text-muted">{children}</td>
    </tr>
  );
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; p?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab, p: selectedProspect } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "overview";
  const { supabase } = await requireUser();

  const { data: business } = await supabase.from("businesses").select("*").eq("id", id).single<Business>();
  if (!business) notFound();
  const { data: segments } = await supabase
    .from("segments")
    .select("*")
    .eq("business_id", id)
    .order("fit_score", { ascending: false })
    .returns<Segment[]>();

  const totals = (segments ?? []).reduce(
    (t, s) => ({
      sent: t.sent + s.sent,
      replies: t.replies + s.replies,
      positive: t.positive + s.positive_replies,
      meetings: t.meetings + s.meetings,
      spend: t.spend + s.spend_cents,
    }),
    { sent: 0, replies: 0, positive: 0, meetings: 0, spend: 0 },
  );
  const segmentName = new Map((segments ?? []).map((s) => [s.id, s.name]));
  const host = business.website ? new URL(business.website).hostname : null;

  const stats = [
    { label: "Emails sent", value: totals.sent.toLocaleString("en-US") },
    { label: "Replies", value: totals.replies.toLocaleString("en-US") },
    { label: "Warm leads", value: totals.positive.toLocaleString("en-US") },
    { label: "Meetings booked", value: totals.meetings.toLocaleString("en-US"), highlight: totals.meetings > 0 },
    { label: "Cost per warm lead", value: totals.positive ? formatUsd(totals.spend / totals.positive) : "–" },
  ];

  return (
    <div className="space-y-8">
      <AutoRefresh active={business.status === "analyzing"} />

      <div>
        <Link href="/app" className="btn-quiet -ml-3">
          <ChevronLeft size={16} aria-hidden="true" />
          Campaigns
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl">{business.name ?? host ?? "Your business"}</h1>
              <StatusPill status={business.status} />
            </div>
            {business.website ? (
              <a href={business.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-muted underline underline-offset-4" translate="no">
                {host}
              </a>
            ) : (
              <p className="mt-1 max-w-xl text-sm text-muted">{business.description}</p>
            )}
          </div>
          <RunControls id={business.id} status={business.status} />
        </div>
      </div>

      {business.status === "analyzing" && (
        <div role="status" className="panel flex items-start gap-4 p-6">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-dawn motion-reduce:animate-none" aria-hidden="true" />
          <div>
            <p className="font-semibold">{host ? `Reading ${host} and researching competitors…` : "Studying your description and researching competitors…"}</p>
            <p className="mt-1 text-sm text-muted">This usually takes one to two minutes. The page updates by itself.</p>
          </div>
        </div>
      )}
      {business.status === "failed" && (
        <div role="alert" className="panel border-danger/40 p-6">
          <p className="font-semibold text-danger">The analysis didn&apos;t finish</p>
          <p className="mt-1 text-sm text-muted">{business.error}</p>
          <p className="mt-2 text-sm">{host ? "Check that the website loads in a browser, then choose Analyze again." : "Try Analyze again. If it keeps failing, start a new campaign with a fuller description."}</p>
        </div>
      )}
      {business.status === "ready" && (
        <div className="rounded-[var(--radius-panel)] bg-dawn-soft p-5 text-sm text-dawn-ink">
          Review the buyer types below and pause any you don&apos;t want. When it looks right, choose Start agent.
        </div>
      )}

      <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line [gap:1px] sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className={`p-4 sm:p-5 ${s.highlight ? "bg-dawn-soft" : "bg-surface"}`}>
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums sm:text-3xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Campaign sections" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/app/b/${id}?tab=${t.id}`}
                aria-current={t.id === tab ? "page" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm transition-colors ${
                  t.id === tab ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "overview" && (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <section aria-label="Buyer types" className="panel overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Buyer type</th>
                  <th scope="col">Fit</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="!text-right">Sent</th>
                  <th scope="col" className="!text-right">Warm</th>
                  <th scope="col" className="!text-right">Per lead</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {(segments ?? []).map((s) => (
                  <tr key={s.id}>
                    <td className="min-w-56">
                      <p className="font-semibold">{s.name}</p>
                      <p className="mt-0.5 max-w-md text-muted">{s.rationale}</p>
                    </td>
                    <td>{s.fit_score}%</td>
                    <td><StatusPill status={s.status} /></td>
                    <td className="text-right">{s.sent}</td>
                    <td className="text-right">{s.positive_replies}</td>
                    <td className="text-right">{s.positive_replies ? formatUsd(s.spend_cents / s.positive_replies) : "–"}</td>
                    <td className="text-right">
                      {s.status !== "exhausted" && (
                        <form action={setSegmentStatus.bind(null, id, s.id, s.status === "paused" ? "testing" : "paused")}>
                          <button className="btn-quiet !min-h-9" aria-label={`${s.status === "paused" ? "Resume" : "Pause"} ${s.name}`}>
                            {s.status === "paused" ? "Resume" : "Pause"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {!segments?.length && (
                  <EmptyRow colSpan={7}>
                    {business.status === "analyzing"
                      ? "Buyer types appear here when the analysis finishes."
                      : "No buyer types yet. Choose Analyze again to generate them."}
                  </EmptyRow>
                )}
              </tbody>
            </table>
          </section>

          <aside className="space-y-6">
            {business.summary && (
              <section className="panel space-y-3 p-5 text-sm">
                <h2 className="text-lg">What the agent will pitch</h2>
                <p className="text-muted">{business.summary}</p>
                <p><span className="font-semibold">Offer:</span> {business.offer}</p>
                <ul className="list-disc space-y-1 pl-5 text-muted">
                  {business.value_props.map((v) => <li key={v}>{v}</li>)}
                </ul>
              </section>
            )}
            {business.competitors.length > 0 && (
              <section className="panel space-y-3 p-5 text-sm">
                <h2 className="text-lg">Competitors it studied</h2>
                <ul className="space-y-3">
                  {business.competitors.map((c) => (
                    <li key={c.domain}>
                      <p className="font-semibold">{c.name} <span className="font-normal text-muted" translate="no">{c.domain}</span></p>
                      <p className="text-muted">{c.note}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="panel p-5 text-sm">
              <h2 className="text-lg">Spending limits</h2>
              <form action={updateBusinessLimits.bind(null, id)} className="mt-4 space-y-4">
                <div>
                  <label className="label" htmlFor="daily_budget">Daily budget in USD</label>
                  <input className="input tabular-nums" id="daily_budget" name="daily_budget" type="number" min={0} step="0.5"
                    inputMode="decimal" autoComplete="off" defaultValue={business.daily_budget_cents / 100} />
                </div>
                <div>
                  <label className="label" htmlFor="max_emails_per_day">Most emails per day</label>
                  <input className="input tabular-nums" id="max_emails_per_day" name="max_emails_per_day" type="number" min={0} max={500}
                    inputMode="numeric" autoComplete="off" defaultValue={business.max_emails_per_day} aria-describedby="max-hint" />
                  <p id="max-hint" className="hint">New domains should start under 50 a day.</p>
                </div>
                <SubmitButton variant="secondary" pendingLabel="Saving…" className="w-full">Save limits</SubmitButton>
              </form>
            </section>
          </aside>
        </div>
      )}

      {tab === "prospects" && <ProspectsTab businessId={id} segmentName={segmentName} />}
      {tab === "inbox" && <InboxTab businessId={id} selected={selectedProspect} />}
      {tab === "meetings" && <MeetingsTab businessId={id} />}
    </div>
  );
}

async function ProspectsTab({ businessId, segmentName }: { businessId: string; segmentName: Map<string, string> }) {
  const { supabase } = await requireUser();
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Prospect[]>();

  return (
    <section aria-label="People" className="panel overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Company</th>
            <th scope="col">Buyer type</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {(prospects ?? []).map((p) => (
            <tr key={p.id}>
              <td className="min-w-48">
                <Link href={`/app/b/${businessId}?tab=inbox&p=${p.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {personName(p)}
                </Link>
                <p className="text-muted">{p.title}</p>
              </td>
              <td className="min-w-48">
                <p>{p.company}</p>
                <p className="text-muted [overflow-wrap:anywhere]">{p.email}</p>
              </td>
              <td className="text-muted">{segmentName.get(p.segment_id)}</td>
              <td><StatusPill status={p.status} /></td>
            </tr>
          ))}
          {!prospects?.length && (
            <EmptyRow colSpan={4}>No one yet. Once you start the agent, the people it finds appear here.</EmptyRow>
          )}
        </tbody>
      </table>
    </section>
  );
}

async function InboxTab({ businessId, selected }: { businessId: string; selected?: string }) {
  const { supabase } = await requireUser();
  const { data: recent } = await supabase
    .from("messages")
    .select("prospect_id, created_at, direction, intent, prospects(first_name, last_name, email, company, status)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(300);

  type Row = {
    prospect_id: string;
    created_at: string;
    direction: string;
    intent: string | null;
    prospects: Pick<Prospect, "first_name" | "last_name" | "email" | "company" | "status"> | null;
  };
  const conversations = new Map<string, Row & { hasReply: boolean }>();
  for (const row of (recent ?? []) as unknown as Row[]) {
    const existing = conversations.get(row.prospect_id);
    if (!existing) conversations.set(row.prospect_id, { ...row, hasReply: row.direction === "inbound" });
    else if (row.direction === "inbound") existing.hasReply = true;
  }
  const list = [...conversations.values()].sort((a, b) => Number(b.hasReply) - Number(a.hasReply));
  const activeId = selected ?? list.find((c) => c.hasReply)?.prospect_id ?? list[0]?.prospect_id;

  const { data: thread } = activeId
    ? await supabase
        .from("messages")
        .select("*")
        .eq("prospect_id", activeId)
        .eq("business_id", businessId)
        .order("created_at")
        .returns<Message[]>()
    : { data: [] as Message[] };

  if (!list.length) {
    return (
      <div className="panel p-12 text-center">
        <p className="font-semibold">No conversations yet</p>
        <p className="mt-1 text-muted">Every email the agent sends, and every reply it handles, will show up here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <nav aria-label="Conversations" className="panel max-h-[70vh] overflow-y-auto overscroll-contain">
        <ul>
          {list.map((c) => (
            <li key={c.prospect_id} className="border-b border-line last:border-0">
              <Link
                href={`/app/b/${businessId}?tab=inbox&p=${c.prospect_id}`}
                aria-current={c.prospect_id === activeId ? "true" : undefined}
                className={`block px-4 py-3 text-sm transition-colors hover:bg-surface-2 ${c.prospect_id === activeId ? "bg-surface-2" : ""}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{c.prospects ? personName(c.prospects) : "Unknown"}</span>
                  {c.hasReply && <span className="pill bg-success-soft text-success">Replied</span>}
                </span>
                <span className="block truncate text-muted">{c.prospects?.company}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <section aria-label="Conversation" className="panel space-y-4 p-4 sm:p-6">
        {(thread ?? []).map((m) => (
          <article
            key={m.id}
            className={`max-w-[92%] rounded-2xl p-4 text-sm ${m.direction === "inbound" ? "rounded-bl-sm bg-surface-2" : "ml-auto rounded-br-sm bg-paper ring-1 ring-line"}`}
          >
            <header className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-semibold text-ink">{m.direction === "inbound" ? "They replied" : "Agent sent"}</span>
              <time dateTime={m.created_at} className="tabular-nums">{dateTime.format(new Date(m.created_at))}</time>
              {m.intent && <StatusPill status={m.intent} />}
            </header>
            {m.subject && <p className="mb-1 font-semibold">{m.subject}</p>}
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

async function MeetingsTab({ businessId }: { businessId: string }) {
  const { supabase } = await requireUser();
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*, prospects(first_name, last_name, email, company, title)")
    .eq("business_id", businessId)
    .order("starts_at", { ascending: false })
    .returns<(Meeting & { prospects: Prospect | null })[]>();

  return (
    <section aria-label="Meetings" className="panel overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">With</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {(meetings ?? []).map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap">
                <time dateTime={m.starts_at}>{dateTime.format(new Date(m.starts_at))}</time>
              </td>
              <td>
                <p className="font-semibold">{m.prospects ? personName(m.prospects) : "–"}</p>
                <p className="text-muted">{[m.prospects?.title, m.prospects?.company].filter(Boolean).join(", ")}</p>
              </td>
              <td><StatusPill status={m.status} /></td>
            </tr>
          ))}
          {!meetings?.length && (
            <EmptyRow colSpan={3}>No meetings yet. When a prospect accepts a time, the call lands here and in your inbox.</EmptyRow>
          )}
        </tbody>
      </table>
    </section>
  );
}
