import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { formatUsd } from "@/lib/pricing";
import { setSegmentStatus } from "../../../actions";
import { getBusiness, getSegments } from "../data";
import { EmptyState, PageHeader } from "../page-header";

export const metadata = { title: "Targeting" };

export default async function TargetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [business, segments] = await Promise.all([getBusiness(id), getSegments(id)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Targeting"
        description="The kinds of businesses the agent reaches out to. It shifts more of your budget to the buyer types that reply best. Pause any you don’t want."
      />
      {!segments.length ? (
        <EmptyState title="No buyer types yet">
          {business.status === "analyzing" ? "They appear here when the analysis finishes." : "Choose Analyze again on the Dashboard to generate them."}
        </EmptyState>
      ) : (
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
              {segments.map((s) => (
                <tr key={s.id}>
                  <td className="min-w-56">
                    <Link href={`/app/b/${id}/targeting/${s.id}`} className="font-semibold underline-offset-4 hover:underline">{s.name}</Link>
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
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
