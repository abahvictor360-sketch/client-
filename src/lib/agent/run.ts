import { enrichPeople, searchPeople } from "@/lib/apollo";
import { charge, refund } from "@/lib/agent/billing";
import { writeEmail } from "@/lib/agent/write";
import { missingSenderFields, sendProspectEmail } from "@/lib/email";
import { PRICE_PER_EMAIL_CENTS } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";
import type { Account, Business, Message, Prospect, Segment, SegmentStatus } from "@/lib/types";

// Each cron tick sends at most this many emails per business, which spreads a
// day's volume over the day instead of bursting it (better for deliverability).
const MAX_SENDS_PER_TICK = 8;
// Days to wait before follow-up #1 and #2.
const FOLLOW_UP_DELAYS_DAYS = [3, 4];
const ACTIVE: SegmentStatus[] = ["testing", "working", "scaling"];
const ALLOCATION_WEIGHT: Record<string, number> = { testing: 1, working: 2, scaling: 4 };

type Db = ReturnType<typeof adminClient>;

function withinSendingHours(account: Account) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: account.timezone || "UTC", weekday: "short", hour: "numeric", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const hour = Number(parts.hour);
  return parts.weekday !== "Sat" && parts.weekday !== "Sun" && hour >= 8 && hour < 18;
}

/**
 * Moves segments between testing / working / scaling / paused from their
 * results, so volume flows to whatever books leads cheapest.
 */
export async function optimizeSegments(db: Db, businessId: string) {
  const { data: segments } = await db.from("segments").select("*").eq("business_id", businessId).returns<Segment[]>();
  if (!segments) return;

  for (const s of segments) {
    if (!ACTIVE.includes(s.status) || s.sent < 40) continue;
    const rate = s.positive_replies / s.sent;
    let next: SegmentStatus = s.status;
    if (rate >= 0.04) next = "scaling";
    else if (rate >= 0.015) next = "working";
    else if (s.sent >= 80 && s.positive_replies === 0) next = "paused";
    else if (s.sent >= 150 && rate < 0.01) next = "paused";
    if (next !== s.status) await db.from("segments").update({ status: next }).eq("id", s.id);
  }

  // Never let a running business stall: if nothing is active, revive the best untested segment.
  const { count } = await db
    .from("segments")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .in("status", ACTIVE);
  if (!count) {
    const fallback = segments
      .filter((s) => s.status === "paused" && s.sent < 40)
      .sort((a, b) => b.fit_score - a.fit_score)[0];
    if (fallback) await db.from("segments").update({ status: "testing" }).eq("id", fallback.id);
  }
}

/** Tops a segment up with verified prospects from Apollo. */
async function sourceProspects(db: Db, segment: Segment, needed: number) {
  let page = segment.apollo_page;
  let added = 0;
  for (let attempt = 0; attempt < 4 && added < needed; attempt++) {
    page += 1;
    const people = await searchPeople(segment.filters, page);
    if (people.length === 0) {
      await db.from("segments").update({ status: "exhausted", apollo_page: page }).eq("id", segment.id);
      return added;
    }

    const ids = people.map((p) => p.id);
    const { data: known } = await db
      .from("prospects")
      .select("apollo_id")
      .eq("business_id", segment.business_id)
      .in("apollo_id", ids);
    const knownIds = new Set((known ?? []).map((k) => k.apollo_id));
    const fresh = ids.filter((id) => !knownIds.has(id)).slice(0, Math.ceil((needed - added) * 1.5));
    if (fresh.length === 0) continue;

    const enriched = await enrichPeople(fresh);
    const { data: suppressed } = await db
      .from("suppressions")
      .select("email")
      .in("email", enriched.map((p) => p.email));
    const blocked = new Set((suppressed ?? []).map((s) => s.email));
    const rows = enriched
      .filter((p) => !blocked.has(p.email))
      .map((p) => ({
        business_id: segment.business_id,
        segment_id: segment.id,
        apollo_id: p.apolloId,
        first_name: p.firstName,
        last_name: p.lastName,
        title: p.title,
        company: p.company,
        company_domain: p.companyDomain,
        company_description: p.companyDescription,
        email: p.email,
        linkedin_url: p.linkedinUrl,
        city: p.city,
        country: p.country,
      }));
    if (rows.length) {
      const { data: inserted } = await db
        .from("prospects")
        .upsert(rows, { onConflict: "business_id,email", ignoreDuplicates: true })
        .select("id");
      added += inserted?.length ?? 0;
    }
  }
  await db.from("segments").update({ apollo_page: page }).eq("id", segment.id);
  return added;
}

/** Writes and sends one email in a prospect's sequence. Returns false when out of credits. */
async function sendStep(db: Db, ctx: { account: Account; business: Business; segment: Segment }, prospect: Prospect) {
  const step = prospect.sequence_step;

  // Claim the prospect so an overlapping tick can't send the same step twice.
  const claimedAt = Date.now();
  const { data: claimed } = await db
    .from("prospects")
    .update({ next_action_at: new Date(Date.now() + 30 * 60_000).toISOString() })
    .eq("id", prospect.id)
    .eq("sequence_step", step)
    .eq("status", prospect.status)
    .or(`next_action_at.is.null,next_action_at.lte.${new Date().toISOString()}`)
    .select("id");
  if (!claimed?.length) return true;

  const { data: suppressed } = await db.from("suppressions").select("email").eq("email", prospect.email).maybeSingle();
  if (suppressed) {
    await db.from("prospects").update({ status: "unsubscribed", next_action_at: null }).eq("id", prospect.id);
    return true;
  }

  // One charge per claim; a failed attempt is refunded and a later claim retries.
  const ref = `email:${prospect.id}:${step}:${claimedAt}`;
  if ((await charge(ctx.business.user_id, PRICE_PER_EMAIL_CENTS, "email", ref)) !== "ok") {
    await db.from("prospects").update({ next_action_at: step === 0 ? null : new Date().toISOString() }).eq("id", prospect.id);
    return false;
  }

  try {
    const { data: thread } = await db
      .from("messages")
      .select("*")
      .eq("prospect_id", prospect.id)
      .order("created_at", { ascending: true })
      .returns<Message[]>();
    const lastOutbound = [...(thread ?? [])].reverse().find((m) => m.direction === "outbound");

    const email = await writeEmail({ ...ctx, prospect, step, thread: thread ?? [] });
    const subject = step === 0 || !lastOutbound?.subject ? email.subject : `Re: ${lastOutbound.subject.replace(/^re:\s*/i, "")}`;
    const sent = await sendProspectEmail({ account: ctx.account, prospect, subject, body: email.body });

    await db.from("messages").insert({
      prospect_id: prospect.id,
      business_id: ctx.business.id,
      direction: "outbound",
      subject,
      body: sent.text,
      provider_id: sent.providerId,
    });
    const delay = FOLLOW_UP_DELAYS_DAYS[step];
    await db
      .from("prospects")
      .update({
        status: delay === undefined ? "done" : "contacted",
        sequence_step: step + 1,
        next_action_at: delay === undefined ? null : new Date(Date.now() + delay * 86_400_000).toISOString(),
      })
      .eq("id", prospect.id);
    await db.rpc("bump_segment", {
      p_segment_id: ctx.segment.id,
      p_sent: step === 0 ? 1 : 0,
      p_spend_cents: PRICE_PER_EMAIL_CENTS,
    });
  } catch (err) {
    await refund(ctx.business.user_id, PRICE_PER_EMAIL_CENTS, "refund_failed_email", ref);
    await db
      .from("prospects")
      .update({ next_action_at: new Date(Date.now() + 6 * 3_600_000).toISOString() })
      .eq("id", prospect.id);
    console.error(`Send failed for prospect ${prospect.id}`, err);
  }
  return true;
}

export async function runBusiness(db: Db, business: Business) {
  const { data: account } = await db.from("accounts").select("*").eq("user_id", business.user_id).single<Account>();
  if (!account || missingSenderFields(account).length || !withinSendingHours(account)) return { sent: 0 };

  await optimizeSegments(db, business.id);

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count: sentToday } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("direction", "outbound")
    .gte("created_at", startOfDay.toISOString());
  const dailyCap = Math.min(business.max_emails_per_day, Math.floor(business.daily_budget_cents / PRICE_PER_EMAIL_CENTS));
  let remaining = Math.min(MAX_SENDS_PER_TICK, dailyCap - (sentToday ?? 0));
  if (remaining <= 0) return { sent: 0 };

  const { data: segments } = await db
    .from("segments")
    .select("*")
    .eq("business_id", business.id)
    .in("status", ACTIVE)
    .returns<Segment[]>();
  const segmentById = new Map((segments ?? []).map((s) => [s.id, s]));
  let sent = 0;

  // 1. Follow-ups that are due.
  const { data: due } = await db
    .from("prospects")
    .select("*")
    .eq("business_id", business.id)
    .eq("status", "contacted")
    .lte("next_action_at", new Date().toISOString())
    .order("next_action_at")
    .limit(remaining)
    .returns<Prospect[]>();
  for (const prospect of due ?? []) {
    const segment = segmentById.get(prospect.segment_id);
    if (!segment) continue;
    if (!(await sendStep(db, { account, business, segment }, prospect))) return { sent, outOfCredits: true };
    sent++;
    remaining--;
  }

  // 2. First emails, split across segments by how well each is performing.
  const active = (segments ?? []).filter((s) => ACTIVE.includes(s.status));
  const totalWeight = active.reduce((sum, s) => sum + ALLOCATION_WEIGHT[s.status], 0);
  for (const segment of active.sort((a, b) => ALLOCATION_WEIGHT[b.status] - ALLOCATION_WEIGHT[a.status])) {
    if (remaining <= 0) break;
    const share = Math.max(1, Math.round((remaining * ALLOCATION_WEIGHT[segment.status]) / totalWeight));

    let { data: fresh } = await db
      .from("prospects")
      .select("*")
      .eq("segment_id", segment.id)
      .eq("status", "new")
      .limit(share)
      .returns<Prospect[]>();
    if ((fresh?.length ?? 0) < share) {
      await sourceProspects(db, segment, share * 3);
      ({ data: fresh } = await db
        .from("prospects")
        .select("*")
        .eq("segment_id", segment.id)
        .eq("status", "new")
        .limit(share)
        .returns<Prospect[]>());
    }
    for (const prospect of fresh ?? []) {
      if (remaining <= 0) break;
      if (!(await sendStep(db, { account, business, segment }, prospect))) return { sent, outOfCredits: true };
      sent++;
      remaining--;
    }
  }
  return { sent };
}

/** One pass over every running business. Called by the cron route. */
export async function runAgentTick() {
  const db = adminClient();
  const { data: businesses } = await db.from("businesses").select("*").eq("status", "running").returns<Business[]>();
  const results: Record<string, unknown> = {};
  for (const business of businesses ?? []) {
    try {
      results[business.id] = await runBusiness(db, business);
    } catch (err) {
      console.error(`Agent tick failed for business ${business.id}`, err);
      results[business.id] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return results;
}
