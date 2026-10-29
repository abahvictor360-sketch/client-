import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/supabase/server";
import type { Meeting, Prospect } from "@/lib/types";
import { dateTime, getBusiness, personName } from "../data";
import { EmptyState, PageHeader } from "../page-header";

export const metadata = { title: "Meetings" };

export default async function MeetingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getBusiness(id);
  const { supabase } = await requireUser();
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*, prospects(first_name, last_name, email, company, title)")
    .eq("business_id", id)
    .order("starts_at", { ascending: false })
    .returns<(Meeting & { prospects: Prospect | null })[]>();

  return (
    <div className="space-y-6">
      <PageHeader title="Meetings" description="Calls the agent booked. Each one also arrives in your email as a calendar invite." />
      {!meetings?.length ? (
        <EmptyState title="No meetings yet">When a prospect accepts a time, the call lands here and in your inbox.</EmptyState>
      ) : (
        <section aria-label="Meetings" className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th scope="col">When</th><th scope="col">With</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap"><time dateTime={m.starts_at}>{dateTime.format(new Date(m.starts_at))}</time></td>
                  <td>
                    <p className="font-semibold">{m.prospects ? personName(m.prospects) : "–"}</p>
                    <p className="text-muted">{[m.prospects?.title, m.prospects?.company, m.prospects?.email].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td><StatusPill status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
