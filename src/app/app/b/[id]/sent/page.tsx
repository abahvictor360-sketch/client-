import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/supabase/server";
import type { Message, Prospect } from "@/lib/types";
import { dateTime, getBusiness, getSegments, personName } from "../data";
import { EmptyState, PageHeader } from "../page-header";

export const metadata = { title: "Sent" };
const PAGE = 50;

type Row = Message & { prospects: Pick<Prospect, "first_name" | "last_name" | "email" | "company" | "title" | "segment_id"> | null };

export default async function SentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params;
  const page = Math.max(0, Number((await searchParams).page) || 0);
  const [business, segments] = await Promise.all([getBusiness(id), getSegments(id)]);
  const segmentName = new Map(segments.map((s) => [s.id, s.name]));
  const { supabase } = await requireUser();
  const { data, count } = await supabase
    .from("messages")
    .select("*, prospects(first_name, last_name, email, company, title, segment_id)", { count: "exact" })
    .eq("business_id", id)
    .eq("direction", "outbound")
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1)
    .returns<Row[]>();
  const rows = data ?? [];
  const pages = Math.ceil((count ?? 0) / PAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sent"
        description={`Every email the agent wrote and sent${count ? ` (${count.toLocaleString("en-US")} so far)` : ""}. Open one to read it in full.`}
      />
      {!rows.length ? (
        <EmptyState title="Nothing sent yet">
          {business.status === "running"
            ? "The agent sends on weekdays during working hours. The first emails appear here within the hour."
            : "Start the agent from the Dashboard and the emails it sends appear here."}
        </EmptyState>
      ) : (
        <ul className="panel divide-y divide-line">
          {rows.map((m) => (
            <li key={m.id}>
              <details className="group">
                <summary className="grid cursor-pointer list-none gap-x-4 gap-y-0.5 px-5 py-3.5 hover:bg-surface-2 sm:grid-cols-[14rem_1fr_auto] [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{m.prospects ? personName(m.prospects) : "Unknown"}</span>
                    <span className="block truncate text-sm text-muted">{m.prospects?.company}</span>
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-medium">{m.subject ?? "(follow-up)"}</span>
                    <span className="block truncate text-muted">{m.body.slice(0, 140)}</span>
                  </span>
                  <span className="flex items-center gap-2 text-sm text-muted sm:flex-col sm:items-end sm:gap-1">
                    <time dateTime={m.created_at} className="whitespace-nowrap tabular-nums">{dateTime.format(new Date(m.created_at))}</time>
                    {m.status === "failed" ? <StatusPill status="failed" /> : m.prospects && <span className="truncate text-xs">{segmentName.get(m.prospects.segment_id)}</span>}
                  </span>
                </summary>
                <div className="border-t border-line bg-canvas px-5 py-4 text-sm">
                  <p className="text-muted">To {m.prospects?.email}{m.prospects?.title ? ` · ${m.prospects.title}` : ""}</p>
                  {m.subject && <p className="mt-2 font-semibold">{m.subject}</p>}
                  <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
                  {m.error && <p className="mt-2 text-danger">{m.error}</p>}
                  <Link href={`/app/b/${id}/inbox?p=${m.prospect_id}&all=1`} className="mt-3 inline-block font-medium underline underline-offset-4">Open conversation</Link>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
          {page > 0 ? <Link className="btn-secondary !min-h-10" href={`/app/b/${id}/sent?page=${page - 1}`}>Newer</Link> : <span />}
          <span className="text-muted">Page {page + 1} of {pages}</span>
          {page + 1 < pages ? <Link className="btn-secondary !min-h-10" href={`/app/b/${id}/sent?page=${page + 1}`}>Older</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
