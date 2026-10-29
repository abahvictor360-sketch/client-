import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { formatUsd } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import type { Business, Meeting, Message, Prospect, Segment } from "@/lib/types";
import { setSegmentStatus, updateBusinessLimits } from "../../actions";
import { AutoRefresh, RunControls } from "./controls";

export const maxDuration = 300;

const TABS = ["overview", "prospects", "inbox", "meetings"] as const;
type Tab = (typeof TABS)[number];

function personName(p: Pick<Prospect, "first_name" | "last_name" | "email">) {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium">{value}</p>
    </div>
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
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "overview";
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

  return (
    <div className="space-y-6">
      <AutoRefresh active={business.status === "analyzing"} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-medium tracking-tight">
              {business.name ?? new URL(business.website).hostname}
            </h1>
            <StatusPill status={business.status} />
          </div>
          <a href={business.website} target="_blank" rel="noreferrer" className="text-sm text-muted underline">
            {business.website}
          </a>
        </div>
        <RunControls id={business.id} status={business.status} />
      </div>

      {business.status === "analyzing" && (
        <div className="card p-6">
          <p className="font-medium">The agent is studying your website and competitors…</p>
          <p className="mt-1 text-sm text-muted">This usually takes a minute or two. The page updates on its own.</p>
        </div>
      )}
      {business.status === "failed" && (
        <div className="card border-danger p-6">
          <p className="font-medium text-danger">Analysis failed</p>
          <p className="mt-1 text-sm text-muted">{business.error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Emails sent" value={totals.sent} />
        <Stat label="Replies" value={totals.replies} />
        <Stat label="Warm leads" value={totals.positive} />
        <Stat label="Meetings" value={totals.meetings} />
        <Stat label="Cost / lead" value={totals.positive ? formatUsd(totals.spend / totals.positive) : "—"} />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/app/b/${id}?tab=${t}`}
            className={`border-b-2 px-3 py-2 text-sm capitalize ${t === tab ? "border-fg font-medium" : "border-transparent text-muted"}`}
          >
            {t}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-3">Segment</th>
                    <th className="px-4 py-3">Fit</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Sent</th>
                    <th className="px-4 py-3 text-right">Warm</th>
                    <th className="px-4 py-3 text-right">Cost/lead</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(segments ?? []).map((s) => (
                    <tr key={s.id} className="border-b border-line align-top last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.name}</p>
                        <p className="mt-0.5 max-w-sm text-muted">{s.rationale}</p>
                      </td>
                      <td className="px-4 py-3">{s.fit_score}%</td>
                      <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                      <td className="px-4 py-3 text-right">{s.sent}</td>
                      <td className="px-4 py-3 text-right">{s.positive_replies}</td>
                      <td className="px-4 py-3 text-right">
                        {s.positive_replies ? formatUsd(s.spend_cents / s.positive_replies) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={setSegmentStatus.bind(null, id, s.id, s.status === "paused" ? "testing" : "paused")}>
                          <button className="text-muted underline hover:text-fg">
                            {s.status === "paused" ? "Resume" : "Pause"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {!segments?.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted">
                        Segments appear here once the analysis finishes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </div>

          <aside className="space-y-6">
            {business.summary && (
              <section className="card space-y-3 p-5 text-sm">
                <h2 className="font-medium">What you sell</h2>
                <p className="text-muted">{business.summary}</p>
                <p><span className="text-muted">Offer:</span> {business.offer}</p>
                <ul className="list-disc space-y-1 pl-5 text-muted">
                  {business.value_props.map((v) => <li key={v}>{v}</li>)}
                </ul>
              </section>
            )}
            {business.competitors.length > 0 && (
              <section className="card space-y-2 p-5 text-sm">
                <h2 className="font-medium">Competitors studied</h2>
                {business.competitors.map((c) => (
                  <div key={c.domain}>
                    <p>✓ {c.name} <span className="text-muted">({c.domain})</span></p>
                    <p className="text-muted">{c.note}</p>
                  </div>
                ))}
              </section>
            )}
            <section className="card p-5 text-sm">
              <h2 className="font-medium">Limits</h2>
              <form action={updateBusinessLimits.bind(null, id)} className="mt-3 space-y-3">
                <div>
                  <label className="label" htmlFor="daily_budget">Daily budget (USD)</label>
                  <input className="input" id="daily_budget" name="daily_budget" type="number" min={0} step="0.5"
                    defaultValue={business.daily_budget_cents / 100} />
                </div>
                <div>
                  <label className="label" htmlFor="max_emails_per_day">Max emails per day</label>
                  <input className="input" id="max_emails_per_day" name="max_emails_per_day" type="number" min={0} max={500}
                    defaultValue={business.max_emails_per_day} />
                </div>
                <button className="btn-secondary w-full">Save limits</button>
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
    <section className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted">
          <tr className="border-b border-line">
            <th className="px-4 py-3">Person</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Segment</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {(prospects ?? []).map((p) => (
            <tr key={p.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                <Link href={`/app/b/${businessId}?tab=inbox&p=${p.id}`} className="font-medium hover:underline">
                  {personName(p)}
                </Link>
                <p className="text-muted">{p.title}</p>
              </td>
              <td className="px-4 py-3">
                <p>{p.company}</p>
                <p className="text-muted">{p.email}</p>
              </td>
              <td className="px-4 py-3 text-muted">{segmentName.get(p.segment_id)}</td>
              <td className="px-4 py-3"><StatusPill status={p.status} /></td>
            </tr>
          ))}
          {!prospects?.length && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted">
                No prospects yet. Start the agent and it will find them.
              </td>
            </tr>
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

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="card max-h-[70vh] overflow-y-auto">
        {list.map((c) => (
          <Link
            key={c.prospect_id}
            href={`/app/b/${businessId}?tab=inbox&p=${c.prospect_id}`}
            className={`block border-b border-line px-4 py-3 text-sm last:border-0 ${c.prospect_id === activeId ? "bg-surface-2" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-medium">{c.prospects ? personName(c.prospects) : "Unknown"}</p>
              {c.hasReply && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
            </div>
            <p className="truncate text-muted">{c.prospects?.company}</p>
          </Link>
        ))}
        {!list.length && <p className="p-6 text-center text-sm text-muted">No conversations yet.</p>}
      </section>
      <section className="card space-y-4 p-5 lg:col-span-2">
        {(thread ?? []).map((m) => (
          <div
            key={m.id}
            className={`max-w-[90%] rounded-xl p-4 text-sm ${m.direction === "inbound" ? "bg-surface-2" : "ml-auto bg-accent-soft"}`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{m.direction === "inbound" ? "They wrote" : "Agent sent"}</span>
              <span>·</span>
              <span>{new Date(m.created_at).toLocaleString()}</span>
              {m.intent && <StatusPill status={m.intent} />}
            </div>
            {m.subject && <p className="mb-1 font-medium">{m.subject}</p>}
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
        {!thread?.length && <p className="text-center text-sm text-muted">Select a conversation.</p>}
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
    <section className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted">
          <tr className="border-b border-line">
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">With</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {(meetings ?? []).map((m) => (
            <tr key={m.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">{new Date(m.starts_at).toLocaleString()}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{m.prospects ? personName(m.prospects) : "—"}</p>
                <p className="text-muted">{m.prospects?.title} · {m.prospects?.company}</p>
              </td>
              <td className="px-4 py-3"><StatusPill status={m.status} /></td>
            </tr>
          ))}
          {!meetings?.length && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-muted">No meetings booked yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
