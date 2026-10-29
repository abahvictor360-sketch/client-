import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { formatUsd } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import { setSegmentStatus } from "../../../../actions";
import { getSegments } from "../../data";
import { EmptyState, PageHeader } from "../../page-header";
import { PeopleTable, type PersonRow } from "../../people/people-table";

export const metadata = { title: "Buyer type" };

function FilterList({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((v) => <span key={v} className="pill bg-surface-2 text-ink">{v.replace(/_/g, " ")}</span>)}
      </dd>
    </div>
  );
}

export default async function SegmentPage({ params }: { params: Promise<{ id: string; segmentId: string }> }) {
  const { id, segmentId } = await params;
  const segment = (await getSegments(id)).find((s) => s.id === segmentId);
  if (!segment) notFound();
  const { supabase } = await requireUser();
  const { data: people } = await supabase
    .from("prospects")
    .select("id, first_name, last_name, title, company, email, segment_id, status, city, country, linkedin_url")
    .eq("segment_id", segmentId)
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<PersonRow[]>();

  const stats = [
    { label: "Emails sent", value: segment.sent },
    { label: "Replies", value: segment.replies },
    { label: "Warm leads", value: segment.positive_replies },
    { label: "Meetings", value: segment.meetings },
    { label: "Spent", value: formatUsd(segment.spend_cents) },
  ];

  return (
    <div className="space-y-6">
      <Link href={`/app/b/${id}/targeting`} className="btn-quiet -ml-3">
        <ChevronLeft size={16} aria-hidden="true" /> Targeting
      </Link>
      <PageHeader
        eyebrow={`${segment.fit_score}% fit`}
        title={<span className="flex flex-wrap items-center gap-3">{segment.name} <StatusPill status={segment.status} /></span>}
        description={segment.rationale ?? segment.description}
        actions={
          segment.status !== "exhausted" && (
            <form action={setSegmentStatus.bind(null, id, segment.id, segment.status === "paused" ? "testing" : "paused")}>
              <button className={segment.status === "paused" ? "btn-primary" : "btn-secondary"}>{segment.status === "paused" ? "Resume" : "Pause"}</button>
            </form>
          )
        }
      />
      <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] bg-line ring-1 ring-line [gap:1px] sm:grid-cols-5 [&>:last-child]:col-span-2 sm:[&>:last-child]:col-span-1">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface p-4">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="who-title" className="panel space-y-4 p-5 sm:p-6">
        <h2 id="who-title" className="text-lg">Who the agent looks for</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <FilterList label="Job titles" values={segment.filters.person_titles} />
          <FilterList label="Seniority" values={segment.filters.person_seniorities} />
          <FilterList label="Industries" values={segment.filters.organization_keywords} />
          <FilterList label="Company size (employees)" values={segment.filters.employee_ranges.map((r) => r.replace(",", "–"))} />
          <FilterList label="Locations" values={segment.filters.person_locations} />
        </dl>
      </section>
      <section aria-labelledby="people-title" className="space-y-3">
        <h2 id="people-title" className="text-lg">People found</h2>
        {people?.length ? (
          <PeopleTable businessId={id} rows={people} segmentNames={{ [segment.id]: segment.name }} />
        ) : (
          <EmptyState title="No one yet">When the agent runs, people matching this buyer type appear here.</EmptyState>
        )}
      </section>
    </div>
  );
}
