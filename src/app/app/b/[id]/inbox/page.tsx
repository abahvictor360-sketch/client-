import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/supabase/server";
import type { Message, Prospect } from "@/lib/types";
import { stopProspect } from "../../../actions";
import { StopProspectButton } from "../controls";
import { dateTime, getBusiness, personName } from "../data";
import { EmptyState, PageHeader } from "../page-header";

export const metadata = { title: "Inbox" };

type Row = {
  prospect_id: string;
  created_at: string;
  direction: string;
  intent: string | null;
  body: string;
  prospects: Pick<Prospect, "first_name" | "last_name" | "email" | "company" | "status"> | null;
};

export default async function InboxPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string; all?: string }> }) {
  const { id } = await params;
  const { p: selected, all } = await searchParams;
  await getBusiness(id);
  const { supabase } = await requireUser();
  const { data: recent } = await supabase
    .from("messages")
    .select("prospect_id, created_at, direction, intent, body, prospects(first_name, last_name, email, company, status)")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  // One row per person, newest first; the inbox shows people who replied.
  const conversations = new Map<string, Row & { hasReply: boolean; lastReply?: Row }>();
  for (const row of (recent ?? []) as unknown as Row[]) {
    const existing = conversations.get(row.prospect_id);
    if (!existing) conversations.set(row.prospect_id, { ...row, hasReply: row.direction === "inbound", lastReply: row.direction === "inbound" ? row : undefined });
    else if (row.direction === "inbound" && !existing.hasReply) Object.assign(existing, { hasReply: true, lastReply: row });
  }
  const everything = [...conversations.values()];
  const list = all ? everything : everything.filter((c) => c.hasReply);
  const activeId = selected ?? list[0]?.prospect_id;
  const active = everything.find((c) => c.prospect_id === activeId);

  const { data: thread } = activeId
    ? await supabase.from("messages").select("*").eq("prospect_id", activeId).eq("business_id", id).order("created_at").returns<Message[]>()
    : { data: [] as Message[] };

  const filter = (
    <nav aria-label="Filter" className="flex rounded-[12px] bg-surface p-1 ring-1 ring-line">
      {[{ label: "Replies", href: `/app/b/${id}/inbox`, on: !all }, { label: "All conversations", href: `/app/b/${id}/inbox?all=1`, on: Boolean(all) }].map((f) => (
        <Link key={f.label} href={f.href} aria-current={f.on ? "true" : undefined} className={`rounded-[9px] px-3 py-1.5 text-sm ${f.on ? "bg-surface-2 font-semibold" : "text-muted hover:text-ink"}`}>
          {f.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Inbox" description="Every reply lands here. The agent answers and books meetings for you; step in any time." actions={filter} />
      {!list.length ? (
        <EmptyState title={all ? "No conversations yet" : "No replies yet"}>
          {all ? "Once the agent starts sending, every conversation shows up here." : <>Replies usually start a few days after the first emails go out. See what was sent in <Link className="underline" href={`/app/b/${id}/sent`}>Sent</Link>.</>}
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <nav aria-label="Conversations" className="panel max-h-[70vh] overflow-y-auto overscroll-contain">
            <ul>
              {list.map((c) => (
                <li key={c.prospect_id} className="border-b border-line last:border-0">
                  <Link
                    href={`/app/b/${id}/inbox?p=${c.prospect_id}${all ? "&all=1" : ""}`}
                    aria-current={c.prospect_id === activeId ? "true" : undefined}
                    className={`block px-4 py-3 text-sm transition-colors hover:bg-surface-2 ${c.prospect_id === activeId ? "bg-surface-2" : ""}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{c.prospects ? personName(c.prospects) : "Unknown"}</span>
                      {c.lastReply?.intent ? <StatusPill status={c.lastReply.intent} /> : c.prospects && <StatusPill status={c.prospects.status} />}
                    </span>
                    <span className="block truncate text-muted">{c.prospects?.company}</span>
                    {c.lastReply && <span className="mt-0.5 block truncate text-muted">&ldquo;{c.lastReply.body.slice(0, 90)}&rdquo;</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <section aria-label="Conversation" className="panel space-y-4 p-4 sm:p-6">
            {active?.prospects && ["new", "contacted", "replied", "interested"].includes(active.prospects.status) && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <p className="text-sm text-muted">Want to take this one over yourself?</p>
                <StopProspectButton onStop={stopProspect.bind(null, id, activeId!)} />
              </div>
            )}
            {(thread ?? []).map((m) => (
              <article
                key={m.id}
                className={`max-w-[92%] rounded-2xl p-4 text-sm ${m.direction === "inbound" ? "rounded-bl-sm bg-surface-2" : "ml-auto rounded-br-sm bg-canvas ring-1 ring-line"}`}
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
      )}
    </div>
  );
}
