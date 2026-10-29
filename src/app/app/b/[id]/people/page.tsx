import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getBusiness, getSegments } from "../data";
import { EmptyState, PageHeader } from "../page-header";
import { PeopleTable, type PersonRow } from "./people-table";

export const metadata = { title: "People" };
const PAGE = 100;

export default async function PeoplePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; status?: string }> }) {
  const { id } = await params;
  const { page: rawPage, status } = await searchParams;
  const page = Math.max(0, Number(rawPage) || 0);
  await getBusiness(id);
  const segments = await getSegments(id);
  const { supabase } = await requireUser();
  let query = supabase
    .from("prospects")
    .select("id, first_name, last_name, title, company, email, segment_id, status, city, country, linkedin_url", { count: "exact" })
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (status) query = query.eq("status", status);
  const { data, count } = await query.returns<PersonRow[]>();
  const pages = Math.ceil((count ?? 0) / PAGE);
  const filters = ["", "contacted", "replied", "interested", "booked", "not_interested"];

  return (
    <div className="space-y-6">
      <PageHeader title="People" description={`Everyone the agent found for your buyer types${count ? ` (${count.toLocaleString("en-US")})` : ""}.`} />
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link key={f || "all"} href={`/app/b/${id}/people${f ? `?status=${f}` : ""}`} aria-current={(status ?? "") === f ? "true" : undefined}
            className={`pill !py-1.5 !text-sm ${(status ?? "") === f ? "bg-ink text-surface" : "bg-surface text-muted ring-1 ring-line hover:text-ink"}`}>
            {f ? f.charAt(0).toUpperCase() + f.slice(1).replace("_", " ") : "All"}
          </Link>
        ))}
      </nav>
      {!data?.length ? (
        <EmptyState title={status ? "No one with this status" : "No one yet"}>Once the agent starts, the people it finds appear here.</EmptyState>
      ) : (
        <PeopleTable businessId={id} rows={data} segmentNames={Object.fromEntries(segments.map((s) => [s.id, s.name]))} />
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
          {page > 0 ? <Link className="btn-secondary !min-h-10" href={`/app/b/${id}/people?page=${page - 1}${status ? `&status=${status}` : ""}`}>Previous</Link> : <span />}
          <span className="text-muted">Page {page + 1} of {pages}</span>
          {page + 1 < pages ? <Link className="btn-secondary !min-h-10" href={`/app/b/${id}/people?page=${page + 1}${status ? `&status=${status}` : ""}`}>Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
