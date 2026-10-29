import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { adminDateTime } from "@/lib/admin-data";
import { formatUsd } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";
import type { Business, Message, Segment } from "@/lib/types";
import { DailyChart } from "@/app/app/b/[id]/daily-chart";
import { deleteCampaign, rerunAnalysis, setCampaignPaused } from "../../actions";
import { ConfirmButton } from "../../ui";

export const metadata = { title: "Campaign" };

export default async function AdminCampaign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const { data: business } = await db.from("businesses").select("*").eq("id", id).single<Business>();
  if (!business) notFound();

  const [owner, segments, messages, prospectCounts, meetings, daily, steering] = await Promise.all([
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
    db.rpc("message_daily", { p_business_id: id, p_days: 30, p_tz: "UTC" }),
    db.from("segment_messages").select("id, segment_id, role, body, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  const days = ((daily.data ?? []) as { day: string; sent: number; replies: number }[]).map((d) => ({ day: d.day, sent: Number(d.sent), replies: Number(d.replies) }));
  const segmentName = new Map((segments.data ?? []).map((s) => [s.id, s.name]));
  const facts = Object.entries(business.facts ?? {}).filter(([, v]) => v);
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
        <p className="mt-1 text-sm text-muted">
          Setup: {business.confirmed_at ? `confirmed ${adminDateTime.format(new Date(business.confirmed_at))}` : business.status === "ready" ? "still in the setup steps" : "not started"}
          {" · "}Budget {formatUsd(business.daily_budget_cents)}/day, up to {business.max_emails_per_day} emails/day
        </p>
        {business.error && <p className="mt-2 text-sm text-danger">Last error: {business.error}</p>}
        <div className="mt-3 flex flex-wrap gap-1">
          {business.status === "running" && <ConfirmButton action={setCampaignPaused.bind(null, id, true)} label="Pause" confirmText="Pause this campaign?" />}
          {business.status === "paused" && <ConfirmButton action={setCampaignPaused.bind(null, id, false)} label="Resume" confirmText="Resume sending for this campaign?" />}
          <ConfirmButton action={rerunAnalysis.bind(null, id)} label="Re-run analysis" confirmText="Re-run the website analysis? Buyer types that haven't sent are replaced." />
          <ConfirmButton action={deleteCampaign.bind(null, id)} label="Delete campaign" confirmText="Delete this campaign and all its prospects and conversations?" danger />
        </div>
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line [gap:1px] sm:grid-cols-5 [&>:last-child]:col-span-2 sm:[&>:last-child]:col-span-1">
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

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <DailyChart title="Emails sent (30 days)" unit="sent" total={days.reduce((t, d) => t + d.sent, 0)} days={days.map((d) => ({ day: d.day, value: d.sent }))} />
        <DailyChart title="Replies (30 days)" unit="replies" total={days.reduce((t, d) => t + d.replies, 0)} days={days.map((d) => ({ day: d.day, value: d.replies }))} />
      </div>

      <section className="panel space-y-3 p-6 text-sm" aria-labelledby="cprofile-title">
        <h2 id="cprofile-title" className="text-xl">Business profile</h2>
        <p>{business.summary ?? business.description ?? "Not analyzed yet."}</p>
        {business.offer && <p><span className="font-semibold">Offer:</span> {business.offer}</p>}
        {facts.length > 0 && (
          <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[10rem_1fr]">
            {facts.map(([k, v]) => (
              <div key={k} className="contents"><dt className="text-muted capitalize">{k}</dt><dd className="whitespace-pre-wrap">{v}</dd></div>
            ))}
          </dl>
        )}
        {business.competitors.length > 0 && (
          <p className="text-muted">Competitors: {business.competitors.map((c) => c.domain).join(", ")}</p>
        )}
      </section>

      <section className="panel overflow-x-auto" aria-labelledby="csegments-title">
        <h2 id="csegments-title" className="px-6 pt-5 text-xl">Buyer types</h2>
        <table className="data-table mt-2">
          <thead><tr><th scope="col">Buyer type</th><th scope="col">Status</th><th scope="col" className="!text-right">Fit</th><th scope="col" className="!text-right">Sent</th><th scope="col" className="!text-right">Warm</th><th scope="col" className="!text-right">Spend</th></tr></thead>
          <tbody>
            {(segments.data ?? []).map((s) => (
              <tr key={s.id}>
                <td className="min-w-56">
                  <details>
                    <summary className="cursor-pointer font-medium">{s.name}</summary>
                    <div className="mt-2 space-y-1 text-xs text-muted">
                      {s.brief?.offer && <p><span className="font-semibold text-ink">Offer:</span> {s.brief.offer}</p>}
                      {s.brief?.customer_problem && <p><span className="font-semibold text-ink">Problem:</span> {s.brief.customer_problem}</p>}
                      {s.brief?.example_clients?.length ? <p><span className="font-semibold text-ink">Example clients:</span> {s.brief.example_clients.join(", ")}</p> : null}
                      <p><span className="font-semibold text-ink">Titles:</span> {s.filters.person_titles.join(", ") || "–"}</p>
                      <p><span className="font-semibold text-ink">Industries:</span> {s.filters.organization_keywords.join(", ") || "–"}</p>
                      <p><span className="font-semibold text-ink">Locations:</span> {s.filters.person_locations.join(", ") || "–"}</p>
                    </div>
                  </details>
                </td>
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

      <section className="panel p-6" aria-labelledby="csteer-title">
        <h2 id="csteer-title" className="text-xl">Steering log</h2>
        <p className="mt-1 text-sm text-muted">What the owner asked the agent to change on each buyer type, and its replies.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {(steering.data ?? []).map((m) => (
            <li key={m.id} className={`rounded-[var(--radius-control)] p-3 ${m.role === "user" ? "bg-surface-2" : "border border-line"}`}>
              <p className="text-xs text-muted">
                {m.role === "user" ? "Owner" : "Agent"} · {segmentName.get(m.segment_id) ?? "buyer type"} · {adminDateTime.format(new Date(m.created_at))}
              </p>
              <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
            </li>
          ))}
          {!steering.data?.length && <li className="py-4 text-center text-muted">No steering yet.</li>}
        </ul>
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
