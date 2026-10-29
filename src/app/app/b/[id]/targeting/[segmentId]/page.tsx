import { Building2, Check, CircleCheck, CircleX, MapPin, Megaphone, Package, Users, BarChart3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { formatUsd } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import { setSegmentStatus, updateSegmentBrief } from "../../../../actions";
import { ActionForm } from "../../action-form";
import { dateTime, getBusiness, getSegments } from "../../data";
import { Field } from "../../fields";
import { EmptyState } from "../../page-header";
import { PeopleTable, type PersonRow } from "../../people/people-table";
import { ChipList, SteerForm } from "../campaign-ui";

export const maxDuration = 300;
export const metadata = { title: "Buyer type" };

const TABS = [
  { id: "campaign", label: "Campaign", icon: Megaphone },
  { id: "leads", label: "Leads", icon: Users },
  { id: "progress", label: "Progress", icon: BarChart3 },
] as const;

const FUNNEL = [
  { label: "Found", statuses: null },
  { label: "Emailed", statuses: ["contacted", "replied", "interested", "booked", "not_interested", "done", "bounced", "unsubscribed"] },
  { label: "Replied", statuses: ["replied", "interested", "booked", "not_interested"] },
  { label: "Interested", statuses: ["interested", "booked"] },
  { label: "Booked a call", statuses: ["booked"] },
] as const;

export default async function SegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; segmentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id, segmentId } = await params;
  const rawTab = (await searchParams).tab;
  const tab = TABS.find((t) => t.id === rawTab)?.id ?? "campaign";
  const [business, segments] = await Promise.all([getBusiness(id), getSegments(id)]);
  const segment = segments.find((s) => s.id === segmentId);
  if (!segment) notFound();
  const { supabase } = await requireUser();

  const leadsQuery = (statuses: readonly string[] | null) => {
    let q = supabase.from("prospects").select("id", { count: "exact", head: true }).eq("segment_id", segmentId).eq("business_id", id);
    if (statuses) q = q.in("status", statuses as string[]);
    return q;
  };
  const [{ data: messages }, ...funnelCounts] = await Promise.all([
    supabase.from("segment_messages").select("id, role, body, created_at").eq("segment_id", segmentId).order("created_at").limit(50),
    ...FUNNEL.map((f) => leadsQuery(f.statuses)),
  ]);
  const funnel = FUNNEL.map((f, i) => ({ label: f.label, count: funnelCounts[i].count ?? 0 }));
  const leadCount = funnel[0].count;

  const { data: people } =
    tab === "leads"
      ? await supabase
          .from("prospects")
          .select("id, first_name, last_name, title, company, email, segment_id, status, city, country, linkedin_url")
          .eq("segment_id", segmentId)
          .eq("business_id", id)
          .order("created_at", { ascending: false })
          .limit(100)
          .returns<PersonRow[]>()
      : { data: [] as PersonRow[] };

  const live = business.status === "running" && ["testing", "working", "scaling"].includes(segment.status);
  const plan = [
    { label: "Research company", done: Boolean(business.summary) },
    { label: "Find competitors", done: business.competitors.length > 0 },
    { label: "Find companies & people", done: leadCount > 0 || segment.apollo_page > 0 },
    { label: "Outreach", done: false, active: live || segment.sent > 0 },
  ];
  const brief = segment.brief ?? {};
  const listProps = { businessId: id, segmentId };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      {/* Left: status, plan and the steering conversation. */}
      <div className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl">{segment.name}</h1>
            <div className="mt-2"><StatusPill status={live ? "running" : segment.status} /></div>
          </div>
          {segment.status !== "exhausted" && (
            <form action={setSegmentStatus.bind(null, id, segment.id, segment.status === "paused" ? "testing" : "paused")}>
              <button className={segment.status === "paused" ? "btn-primary" : "btn-secondary"}>{segment.status === "paused" ? "Resume" : "Pause"}</button>
            </form>
          )}
        </div>

        <section aria-labelledby="plan-title" className="panel p-5">
          <h2 id="plan-title" className="text-lg">Plan</h2>
          <ol className="mt-3 space-y-2.5">
            {plan.map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                {s.done ? (
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-teal text-white dark:text-[#0b1f1b]"><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
                ) : s.active ? (
                  <span className="grid h-5 w-5 shrink-0 place-items-center"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-teal motion-reduce:animate-none" /></span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-md ring-1 ring-line" />
                )}
                <span className={s.done ? "text-muted line-through" : s.active ? "font-medium text-teal-ink" : "text-muted"}>{s.label}</span>
                <span className="sr-only">{s.done ? "(done)" : s.active ? "(in progress)" : "(not started)"}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Steer the campaign" className="space-y-3">
          <ul className="space-y-3">
            <li className="text-sm text-muted">
              Tell the agent how to adjust this buyer type: who to target, what to offer, what to avoid. It updates the brief
              and targeting on the right and applies them to the next emails.
            </li>
            {(messages ?? []).map((m) => (
              <li key={m.id} className={m.role === "user" ? "ml-8 rounded-2xl rounded-br-sm bg-surface-2 p-3.5 text-sm" : "text-sm"}>
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
                <time dateTime={m.created_at} className="mt-1 block text-xs text-muted">{dateTime.format(new Date(m.created_at))}</time>
              </li>
            ))}
          </ul>
          <SteerForm businessId={id} segmentId={segmentId} />
        </section>
      </div>

      {/* Right: the campaign brief, leads and progress. */}
      <div className="min-w-0">
        <nav aria-label="Buyer type sections" className="inline-flex max-w-full overflow-x-auto rounded-[14px] bg-surface p-1 ring-1 ring-line">
          {TABS.map(({ id: t, label, icon: Icon }) => (
            <Link
              key={t}
              href={`/app/b/${id}/targeting/${segmentId}?tab=${t}`}
              scroll={false}
              aria-current={t === tab ? "page" : undefined}
              className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 text-sm ${t === tab ? "bg-surface-2 font-semibold" : "text-muted hover:text-ink"}`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
              {t === "leads" && <span className="tabular-nums text-muted">{leadCount.toLocaleString("en-US")}</span>}
            </Link>
          ))}
        </nav>

        {tab === "campaign" && (
          <div className="mt-6 space-y-8">
            <section aria-labelledby="offer-title" className="space-y-4">
              <h2 id="offer-title" className="eyebrow">Your offer</h2>
              <ActionForm action={updateSegmentBrief.bind(null, id, segmentId)} submitLabel="Save" submitClassName="btn-secondary">
                <Field id="offer" label="What you offer this buyer type">
                  <textarea id="offer" name="offer" rows={3} maxLength={600} className="input min-h-24 py-2.5" defaultValue={brief.offer ?? business.offer ?? ""}
                    placeholder="e.g. A fast, professional website and IT support under one contract" />
                </Field>
                <Field id="customer_problem" label="Customer problem">
                  <textarea id="customer_problem" name="customer_problem" rows={2} maxLength={600} className="input min-h-20 py-2.5" defaultValue={brief.customer_problem ?? ""}
                    placeholder="e.g. Need to look credible before growth starts" />
                </Field>
              </ActionForm>
            </section>

            <div className="space-y-6">
              <ChipList {...listProps} field="example_clients" label="Example clients" items={brief.example_clients ?? []} placeholder="Company name…" icon={<Building2 size={17} aria-hidden="true" className="text-teal" />} />
              <ChipList {...listProps} field="positive_criteria" label="Good fit if" items={brief.positive_criteria ?? []} placeholder="e.g. Newly launched…" icon={<CircleCheck size={17} aria-hidden="true" className="text-teal" />} />
              <ChipList {...listProps} field="negative_criteria" label="Not a fit if" items={brief.negative_criteria ?? []} placeholder="e.g. Already has an agency…" icon={<CircleX size={17} aria-hidden="true" className="text-danger" />} />
            </div>

            <section aria-labelledby="targeting-title" className="space-y-6 border-t border-line pt-6">
              <div>
                <h2 id="targeting-title" className="eyebrow">Who the agent looks for</h2>
                <p className="mt-1 text-sm text-muted">Changing these restarts the search for this buyer type.</p>
              </div>
              <ChipList {...listProps} field="person_titles" label="Job titles" items={segment.filters.person_titles} placeholder="e.g. Head of Operations…" icon={<Users size={17} aria-hidden="true" className="text-muted" />} />
              <ChipList {...listProps} field="organization_keywords" label="Industries" items={segment.filters.organization_keywords} placeholder="e.g. hospitality…" icon={<Package size={17} aria-hidden="true" className="text-muted" />} />
              <ChipList {...listProps} field="person_locations" label="Locations" items={segment.filters.person_locations} placeholder="e.g. Lagos, Nigeria…" icon={<MapPin size={17} aria-hidden="true" className="text-muted" />} />
              <p className="text-sm text-muted">
                Seniority: {segment.filters.person_seniorities.map((s) => s.replace(/_/g, " ")).join(", ") || "any"} · Company size:{" "}
                {segment.filters.employee_ranges.map((r) => r.replace(",", "–")).join(", ") || "any"} employees
              </p>
            </section>
          </div>
        )}

        {tab === "leads" && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted">{leadCount.toLocaleString("en-US")} people found for this buyer type{leadCount > 100 ? ", newest 100 shown" : ""}.</p>
            {people?.length ? (
              <PeopleTable businessId={id} rows={people} segmentNames={{ [segment.id]: segment.name }} />
            ) : (
              <EmptyState title="No leads yet">When the agent runs, people matching this buyer type appear here.</EmptyState>
            )}
          </div>
        )}

        {tab === "progress" && (
          <div className="mt-6 space-y-6">
            <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] bg-line ring-1 ring-line [gap:1px] sm:grid-cols-4">
              {[
                { label: "Emails sent", value: segment.sent.toLocaleString("en-US") },
                { label: "Replies", value: segment.replies.toLocaleString("en-US") },
                { label: "Spent", value: formatUsd(segment.spend_cents) },
                { label: "Cost per warm lead", value: segment.positive_replies ? formatUsd(segment.spend_cents / segment.positive_replies) : "–" },
              ].map((s) => (
                <div key={s.label} className="bg-surface p-4">
                  <dt className="text-sm text-muted">{s.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
            <section aria-labelledby="funnel-title" className="panel p-5 sm:p-6">
              <h2 id="funnel-title" className="text-lg">Funnel</h2>
              <ol className="mt-4 space-y-3">
                {funnel.map((f) => (
                  <li key={f.label} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 text-sm">
                    <span className="text-muted">{f.label}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                      <span className="block h-full rounded-full bg-teal" style={{ width: `${funnel[0].count ? Math.max(f.count ? 2 : 0, (f.count / funnel[0].count) * 100) : 0}%` }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{f.count.toLocaleString("en-US")}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
