import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { adminDateTime } from "@/lib/admin-data";
import { formatUsd } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";
import type { Business, Message, Segment } from "@/lib/types";
import { deleteCampaign, rerunAnalysis, setCampaignPaused } from "../../actions";
import { ConfirmButton } from "../../ui";

export const metadata = { title: "Campaign" };

export default async function AdminCampaign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const { data: business } = await db.from("businesses").select("*").eq("id", id).single<Business>();
  if (!business) notFound();

  const [owner, segments, messages, prospectCounts, meetings] = await Promise.all([
    db.auth.admin.getUserById(business.user_id),
    db.from("segments").select("*").eq("business_id", id).order("fit_score", { ascending: false }).returns<Segment[]>(),
    db
      .from("messages")
      .select("*, prospects(email, first_name, last_name, company)")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<(Message & { prospects: { email: string; first_name: string | null; last_name: string | null; company: string | null } | null })[]>(),
    db.from("prospects").select("status").eq("business_id", id),
    db.from("meetings").select("id", { count: "exact", head: true }).eq("business_id", id),
  ]);
  const byStatus = new Map<string, number>();
  for (const p of prospectCounts.data ?? []) byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);

  return (
    <>
      <div>
        <Link href="/admin/campaigns" className="btn-quiet -ml-3"><ChevronLeft size={16} aria-hidden="true" />Campaigns</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{business.name ?? business.website ?? "Untitled"}</h1>
          <StatusPill status={business.status} />
        </div>
        <p className="mt-1 text-muted">
          Owner:{" "}
          <Link href={`/admin/users/${business.user_id}`} className="underline underline-offset-4">{owner.data.user?.email}</Link>
          {business.website && <> · <a href={business.website} target="_blank" rel="noreferrer" className="underline underline-offset-4">{business.website}</a></>}
        </p>
        {business.error && <p className="mt-2 text-sm text-danger">Last error: {business.error}</p>}
        <div className="mt-3 flex flex-wrap gap-1">
          {business.status === "running" && <ConfirmButton action={setCampaignPaused.bind(null, id, true)} label="Pause" confirmText="Pause this campaign?" />}
          {business.status === "paused" && <ConfirmButton action={setCampaignPaused.bind(null, id, false)} label="Resume" confirmText="Resume sending for this campaign?" />}
          <ConfirmButton action={rerunAnalysis.bind(null, id)} label="Re-run analysis" confirmText="Re-run the website analysis? Buyer types that haven't sent are replaced." />
          <ConfirmButton action={deleteCampaign.bind(null, id)} label="Delete campaign" confirmText="Delete this campaign and all its prospects and conversations?" danger />
        </div>
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line [gap:1px] sm:grid-cols-5">
        {[
          ["People found", prospectCounts.data?.length ?? 0],
          ["Contacted", (byStatus.get("contacted") ?? 0) + (byStatus.get("done") ?? 0)],
          ["Replied", (byStatus.get("replied") ?? 0) + (byStatus.get("interested") ?? 0) + (byStatus.get("booked") ?? 0)],
          ["Meetings", meetings.count ?? 0],
          ["Unsubscribed / bounced", (byStatus.get("unsubscribed") ?? 0) + (byStatus.get("bounced") ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface p-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="panel overflow-x-auto" aria-labelledby="csegments-title">
        <h2 id="csegments-title" className="px-6 pt-5 text-xl">Buyer types</h2>
        <table className="data-table mt-2">
          <thead><tr><th scope="col">Buyer type</th><th scope="col">Status</th><th scope="col" className="!text-right">Fit</th><th scope="col" className="!text-right">Sent</th><th scope="col" className="!text-right">Warm</th><th scope="col" className="!text-right">Spend</th></tr></thead>
          <tbody>
            {(segments.data ?? []).map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td><StatusPill status={s.status} /></td>
                <td className="text-right">{s.fit_score}%</td>
                <td className="text-right">{s.sent}</td>
                <td className="text-right">{s.positive_replies}</td>
                <td className="text-right">{formatUsd(s.spend_cents)}</td>
              </tr>
            ))}
            {!segments.data?.length && <tr><td colSpan={6} className="!py-8 text-center text-muted">No buyer types.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="panel p-6" aria-labelledby="cmessages-title">
        <h2 id="cmessages-title" className="text-xl">Latest emails</h2>
        <ul className="mt-4 space-y-3">
          {(messages.data ?? []).map((m) => (
            <li key={m.id} className="rounded-[var(--radius-control)] border border-line p-4 text-sm">
              <p className="text-xs text-muted">
                {m.direction === "inbound" ? "From" : "To"} {m.prospects?.email} · {adminDateTime.format(new Date(m.created_at))}
                {m.intent && ` · ${m.intent.replace(/_/g, " ")}`}
              </p>
              {m.subject && <p className="mt-1 font-semibold">{m.subject}</p>}
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-muted">{m.body}</p>
            </li>
          ))}
          {!messages.data?.length && <li className="py-6 text-center text-muted">No emails yet.</li>}
        </ul>
      </section>
    </>
  );
}
