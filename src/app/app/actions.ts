"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { analyzeBusiness } from "@/lib/agent/analyze";
import { addSendingDomain, refreshSendingDomain, removeSendingDomain, senderProblem } from "@/lib/domains";
import { missingSenderFields } from "@/lib/email";
import { missingAnalysisConfig } from "@/lib/env";
import { trialStatus } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";
import { normalizeWebsite } from "@/lib/website";
import { HEARD_FROM, SETUP_STEPS, type SetupStep, setupHref, stepIndex } from "./b/[id]/setup/steps";

// Users can only read through the database API; every change goes through
// these actions, which check ownership and the app's rules, then write with
// the server's key.

const MAX_CAMPAIGNS = 10;
const MAX_ANALYSES_PER_DAY = 5;
const SUSPENDED = "Your account is suspended. Contact support if you think this is a mistake.";

async function session() {
  const { user } = await requireUser();
  if (!user) redirect("/login");
  const db = adminClient();
  const { data: account } = await db.from("accounts").select("*").eq("user_id", user.id).single<Account>();
  return { user, account, db };
}

/** Checks the caller owns the business (and isn't suspended) before any change. */
async function ownedBusiness(id: string) {
  const ctx = await session();
  const { data: business } = await ctx.db
    .from("businesses")
    .select("id, status, user_id")
    .eq("id", id)
    .eq("user_id", ctx.user.id)
    .single();
  if (!business) throw new Error("Not found");
  return { ...ctx, business };
}

function configError() {
  const missing = missingAnalysisConfig();
  return missing.length
    ? `The agent isn't set up yet: ${missing.join(" and ")} must be set on the server. Please try again later.`
    : null;
}

/** Website analysis uses an expensive model with web search, so it's rate limited. */
async function analysisQuotaError(ctx: Awaited<ReturnType<typeof session>>) {
  if (ctx.account?.is_admin) return null;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await ctx.db
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.user.id)
    .eq("kind", "analysis")
    .gte("created_at", since);
  return (count ?? 0) >= MAX_ANALYSES_PER_DAY
    ? `You can run ${MAX_ANALYSES_PER_DAY} analyses a day. Try again tomorrow.`
    : null;
}

async function startAnalysis(ctx: Awaited<ReturnType<typeof session>>, businessId: string) {
  await ctx.db.from("usage_events").insert({ user_id: ctx.user.id, kind: "analysis" });
  after(() => analyzeBusiness(businessId).catch((err) => console.error("Analysis failed", err)));
}

export async function createBusiness(_: unknown, form: FormData) {
  const ctx = await session();
  if (ctx.account?.suspended) return { error: SUSPENDED };
  const notReady = configError() ?? (await analysisQuotaError(ctx));
  if (notReady) return { error: notReady };

  const { count } = await ctx.db
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.user.id);
  if (!ctx.account?.is_admin && (count ?? 0) >= MAX_CAMPAIGNS) {
    return { error: `You can have up to ${MAX_CAMPAIGNS} campaigns. Delete one to start another.` };
  }

  const about = String(form.get("about") ?? "").trim();
  let website: string | null = null;
  if (about) {
    if (about.length < 15) return { error: "Describe what you sell in at least a full sentence." };
    if (about.length > 500) return { error: "Keep the description under 500 characters." };
  } else {
    try {
      website = normalizeWebsite(String(form.get("website") ?? "")).href;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Invalid website" };
    }
  }
  const { data, error } = await ctx.db
    .from("businesses")
    .insert({ user_id: ctx.user.id, website, description: about || null })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not create the campaign. Please try again." };

  await startAnalysis(ctx, data.id);
  redirect(`/app/b/${data.id}`);
}

export async function reanalyzeBusiness(id: string): Promise<{ error?: string }> {
  const ctx = await ownedBusiness(id);
  if (ctx.account?.suspended) return { error: SUSPENDED };
  const notReady = configError() ?? (await analysisQuotaError(ctx));
  if (notReady) return { error: notReady };
  await ctx.db
    .from("businesses")
    .update({ status: "analyzing", error: null, analysis_started_at: new Date().toISOString() })
    .eq("id", id);
  await startAnalysis(ctx, id);
  revalidatePath(`/app/b/${id}`, "layout");
  return {};
}

export async function setBusinessRunning(id: string, running: boolean) {
  const { db, user, account, business } = await ownedBusiness(id);
  if (running) {
    if (account?.suspended) return { error: SUSPENDED };
    if (business.status === "analyzing" || business.status === "failed") {
      return { error: "Wait for the analysis to finish first." };
    }
    const missing = account ? missingSenderFields(account) : ["account"];
    if (missing.length) return { error: `Add your ${missing.join(", ")} in Settings before starting.` };
    const problem = await senderProblem(user.id, account!.sender_email!);
    if (problem) return { error: `${problem} (Settings)` };
    if (!trialStatus(account?.trial_ends_at).active && (account?.credits_cents ?? 0) <= 0) {
      return { error: "Your free trial has ended. Add credits to keep the agent running." };
    }
  }
  await db.from("businesses").update({ status: running ? "running" : "paused" }).eq("id", id);
  revalidatePath(`/app/b/${id}`, "layout");
  return {};
}

export async function updateBusinessLimits(id: string, _: unknown, form: FormData): Promise<{ error?: string; message?: string }> {
  const { db } = await ownedBusiness(id);
  const budget = Math.round(Number(form.get("daily_budget")) * 100);
  const maxPerDay = Math.round(Number(form.get("max_emails_per_day")));
  if (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000) {
    return { error: "Enter a daily budget between $0 and $10,000." };
  }
  if (!Number.isFinite(maxPerDay) || maxPerDay < 0 || maxPerDay > 500) {
    return { error: "Emails per day must be between 0 and 500." };
  }
  const { error } = await db
    .from("businesses")
    .update({ daily_budget_cents: budget, max_emails_per_day: maxPerDay })
    .eq("id", id);
  if (error) return { error: "Couldn't save the limits. Please try again." };
  revalidatePath(`/app/b/${id}`, "layout");
  return { message: "Limits saved" };
}

export async function setSegmentStatus(businessId: string, segmentId: string, status: "testing" | "paused") {
  const { db } = await ownedBusiness(businessId);
  await db.from("segments").update({ status }).eq("id", segmentId).eq("business_id", businessId);
  revalidatePath(`/app/b/${businessId}`, "layout");
}

/** Stops all further emails to one prospect (their conversation is kept). */
export async function stopProspect(businessId: string, prospectId: string) {
  const { db } = await ownedBusiness(businessId);
  await db
    .from("prospects")
    .update({ status: "done", next_action_at: null })
    .eq("id", prospectId)
    .eq("business_id", businessId);
  revalidatePath(`/app/b/${businessId}`, "layout");
}

export async function deleteBusiness(id: string) {
  const { db } = await ownedBusiness(id);
  await db.from("businesses").delete().eq("id", id);
  revalidatePath("/app");
  redirect("/app");
}

/**
 * Validates the account fields present in a form. Forms only send the fields
 * they show, so each one (settings, setup steps) updates just its own part.
 */
async function accountPatch(userId: string, form: FormData): Promise<{ error: string } | { patch: Record<string, unknown> }> {
  const patch: Record<string, unknown> = {};
  const text = (key: string, max = 300) => {
    const value = String(form.get(key) ?? "").trim().slice(0, max);
    return value || null;
  };
  const int = (key: string) => {
    const n = Number(form.get(key));
    return Number.isInteger(n) ? n : NaN;
  };
  for (const [key, max] of [["company_name", 120], ["sender_name", 120], ["sender_title", 120], ["postal_address", 300]] as const) {
    if (form.has(key)) patch[key] = text(key, max);
  }
  if (form.has("timezone")) {
    const timezone = text("timezone", 64) ?? "UTC";
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      return { error: `Unknown timezone "${timezone}". Use a name like Europe/London or Africa/Lagos.` };
    }
    patch.timezone = timezone;
  }
  if (form.has("sender_email")) {
    const senderEmail = text("sender_email", 254)?.toLowerCase() ?? null;
    if (senderEmail) {
      const problem = await senderProblem(userId, senderEmail);
      if (problem) return { error: problem };
    }
    patch.sender_email = senderEmail;
  }
  if (form.has("working_hours_start") || form.has("working_hours_end")) {
    const start = int("working_hours_start");
    const end = int("working_hours_end");
    if (!(start >= 0) || !(end <= 24) || !(end >= start + 2)) return { error: "Working hours must span at least two hours." };
    patch.working_hours_start = start;
    patch.working_hours_end = end;
  }
  if (form.has("meeting_minutes")) {
    const minutes = int("meeting_minutes");
    if (!(minutes >= 10 && minutes <= 180)) return { error: "Meeting length must be between 10 and 180 minutes." };
    patch.meeting_minutes = minutes;
  }
  if (form.has("meeting_link")) {
    const meetingLink = text("meeting_link", 500);
    if (meetingLink && !/^https:\/\//i.test(meetingLink)) return { error: "The booking link must start with https://" };
    patch.meeting_link = meetingLink;
  }
  return { patch };
}

export async function updateAccount(_: unknown, form: FormData): Promise<{ error?: string; message?: string }> {
  const { user, db, account } = await session();
  if (account?.suspended) return { error: SUSPENDED };
  const result = await accountPatch(user.id, form);
  if ("error" in result) return result;
  const { error } = await db.from("accounts").update(result.patch).eq("user_id", user.id);
  if (error) return { error: "Couldn't save settings. Please try again." };
  revalidatePath("/app", "layout");
  return { message: "Saved" };
}

/** Saves the sending schedule (account hours) and, from a campaign, its limits. */
export async function updateSchedule(businessId: string | null, _: unknown, form: FormData): Promise<{ error?: string; message?: string }> {
  const ctx = businessId ? await ownedBusiness(businessId) : await session();
  const result = await accountPatch(ctx.user.id, form);
  if ("error" in result) return result;
  const { error } = await ctx.db.from("accounts").update(result.patch).eq("user_id", ctx.user.id);
  if (error) return { error: "Couldn't save the schedule. Please try again." };
  if (businessId && form.has("daily_budget")) {
    const limits = await updateBusinessLimits(businessId, undefined, form);
    if (limits.error) return limits;
  }
  revalidatePath("/app", "layout");
  return { message: "Schedule saved" };
}

const FACT_KEYS = ["pricing", "capabilities", "proof"] as const;

function readFacts(form: FormData) {
  const facts: Record<string, string> = {};
  for (const key of FACT_KEYS) {
    const value = String(form.get(key) ?? "").trim();
    if (value.length > 1000) return { error: "Keep each answer under 1,000 characters." };
    if (value) facts[key] = value;
  }
  return { facts };
}

/** Edits what the agent says about the business (the Business profile page). */
export async function updateProfile(id: string, _: unknown, form: FormData) {
  const { db, account } = await ownedBusiness(id);
  if (account?.suspended) return { error: SUSPENDED };
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const summary = String(form.get("summary") ?? "").trim();
  const offer = String(form.get("offer") ?? "").trim();
  const valueProps = String(form.get("value_props") ?? "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!name || summary.length < 10) return { error: "Add a name and a sentence about what you do." };
  if (summary.length > 600 || offer.length > 600 || valueProps.some((v) => v.length > 300)) {
    return { error: "That's a bit long. Keep each field under 600 characters." };
  }
  const read = readFacts(form);
  if (read.error) return { error: read.error };
  await db
    .from("businesses")
    .update({ name, summary, offer: offer || null, value_props: valueProps, facts: read.facts })
    .eq("id", id);
  revalidatePath(`/app/b/${id}`, "layout");
  return { message: "Saved" };
}

function competitorDomain(raw: string) {
  try {
    return normalizeWebsite(raw).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function addCompetitor(id: string, _: unknown, form: FormData): Promise<{ error?: string } | undefined> {
  const { db } = await ownedBusiness(id);
  const domain = competitorDomain(String(form.get("domain") ?? ""));
  if (!domain) return { error: "Enter a website like rival.com" };
  const { data } = await db.from("businesses").select("competitors").eq("id", id).single();
  const competitors = (data?.competitors ?? []) as { name: string; domain: string; note: string }[];
  if (competitors.some((c) => c.domain === domain)) return { error: "Already on the list." };
  if (competitors.length >= 15) return { error: "You can list up to 15 competitors." };
  await db.from("businesses").update({ competitors: [...competitors, { name: domain, domain, note: "" }] }).eq("id", id);
  revalidatePath(`/app/b/${id}`, "layout");
  return {};
}

export async function removeCompetitor(id: string, domain: string) {
  const { db } = await ownedBusiness(id);
  const { data } = await db.from("businesses").select("competitors").eq("id", id).single();
  const competitors = (data?.competitors ?? []) as { domain: string }[];
  await db.from("businesses").update({ competitors: competitors.filter((c) => c.domain !== domain) }).eq("id", id);
  revalidatePath(`/app/b/${id}`, "layout");
}

/** "No, that's not us": the owner corrects the description and the agent starts over. */
export async function correctBusiness(id: string, _: unknown, form: FormData) {
  const ctx = await ownedBusiness(id);
  if (ctx.account?.suspended) return { error: SUSPENDED };
  const about = String(form.get("about") ?? "").trim();
  if (about.length < 15) return { error: "Describe what you sell in at least a full sentence." };
  if (about.length > 500) return { error: "Keep the description under 500 characters." };
  const notReady = configError() ?? (await analysisQuotaError(ctx));
  if (notReady) return { error: notReady };
  // The description replaces a website that was misread.
  await ctx.db
    .from("businesses")
    .update({ website: null, description: about, status: "analyzing", error: null, analysis_started_at: new Date().toISOString() })
    .eq("id", id);
  await startAnalysis(ctx, id);
  revalidatePath(`/app/b/${id}`, "layout");
  redirect(`/app/b/${id}`);
}

/** Saves one setup step's answers, then moves to the next step. */
export async function saveSetupStep(id: string, step: SetupStep, _: unknown, form: FormData) {
  const ctx = await ownedBusiness(id);
  if (ctx.account?.suspended) return { error: SUSPENDED };

  if (step === "sender" || step === "mailbox" || step === "schedule") {
    const result = await accountPatch(ctx.user.id, form);
    if ("error" in result) return result;
    if (step === "sender" && !result.patch.sender_name) return { error: "Add the name emails are signed with." };
    if (step === "sender" && !result.patch.company_name) return { error: "Add your company name." };
    if (step === "mailbox" && !result.patch.sender_email) return { error: "Add the address emails are sent from." };
    if (step === "mailbox" && !result.patch.postal_address) return { error: "Add a postal address (anti-spam laws require it)." };
    await ctx.db.from("accounts").update(result.patch).eq("user_id", ctx.user.id);
    if (step === "schedule") {
      const limits = await updateBusinessLimits(id, undefined, form);
      if (limits.error) return limits;
    }
  } else if (step === "facts") {
    const read = readFacts(form);
    if (read.error) return { error: read.error };
    await ctx.db.from("businesses").update({ facts: read.facts }).eq("id", id);
  } else if (step === "source") {
    const answer = String(form.get("heard_from") ?? "");
    if (!(HEARD_FROM as readonly string[]).includes(answer)) return { error: "Pick one option." };
    await ctx.db.from("accounts").update({ heard_from: answer }).eq("user_id", ctx.user.id);
  }

  const next = SETUP_STEPS[stepIndex(step) + 1];
  revalidatePath("/app", "layout");
  redirect(setupHref(id, next?.id ?? "launch"));
}

/** Finishes setup and starts the agent, then shows the "Campaign launched" explainer. */
export async function launchBusiness(id: string): Promise<{ error?: string }> {
  const result = await setBusinessRunning(id, true);
  if (result.error) return result;
  const { db } = await ownedBusiness(id);
  await db.from("businesses").update({ confirmed_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/app", "layout");
  redirect(`/app/b/${id}?launched=1`);
}

/** Leaves setup without launching; the campaign can be started from its dashboard. */
export async function finishSetupLater(id: string) {
  const { db } = await ownedBusiness(id);
  await db.from("businesses").update({ confirmed_at: new Date().toISOString() }).eq("id", id).is("confirmed_at", null);
  revalidatePath("/app", "layout");
  redirect(`/app/b/${id}`);
}

export async function addOwnSuppression(_: unknown, form: FormData): Promise<{ error?: string; message?: string }> {
  const { user, db } = await session();
  const values = String(form.get("values") ?? "")
    .split(/[\s,;]+/)
    .map((v) => v.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  if (!values.length) return { error: "Enter at least one email address or domain." };
  if (values.length > 500) return { error: "Add up to 500 at a time." };
  const bad = values.find((v) => !/^([^\s@]+@)?[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v) || v.length > 254);
  if (bad) return { error: `"${bad}" isn't an email address or domain.` };
  const { count } = await db.from("user_suppressions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) + values.length > 10_000) return { error: "Your list can hold up to 10,000 entries." };
  const { error } = await db
    .from("user_suppressions")
    .upsert(values.map((value) => ({ user_id: user.id, value })), { onConflict: "user_id,value", ignoreDuplicates: true });
  if (error) return { error: "Couldn't save the list. Please try again." };
  // Stop anyone already queued who is now on the list.
  const { data: businesses } = await db.from("businesses").select("id").eq("user_id", user.id);
  const ids = (businesses ?? []).map((b) => b.id);
  const emails = values.filter((v) => v.includes("@"));
  if (ids.length && emails.length) {
    await db.from("prospects").update({ status: "done", next_action_at: null }).in("business_id", ids).in("email", emails)
      .in("status", ["new", "contacted"]);
  }
  for (const domain of values.filter((v) => !v.includes("@"))) {
    if (ids.length) {
      await db.from("prospects").update({ status: "done", next_action_at: null }).in("business_id", ids)
        .ilike("email", `%@${domain.replace(/[%_]/g, "")}`).in("status", ["new", "contacted"]);
    }
  }
  revalidatePath("/app/suppress");
  return { message: `Added ${values.length} ${values.length === 1 ? "entry" : "entries"}.` };
}

export async function removeOwnSuppression(id: string) {
  const { user, db } = await session();
  await db.from("user_suppressions").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/suppress");
}

export async function addDomain(_: unknown, form: FormData): Promise<{ error?: string; message?: string }> {
  const { user, account } = await session();
  if (account?.suspended) return { error: SUSPENDED };
  const result = await addSendingDomain(user.id, String(form.get("domain") ?? ""), Boolean(account?.is_admin));
  revalidatePath("/app", "layout");
  return result;
}

export async function checkDomain(domainId: string): Promise<{ error?: string; message?: string }> {
  const { user } = await session();
  const result = await refreshSendingDomain(user.id, domainId);
  revalidatePath("/app", "layout");
  return result;
}

export async function removeDomain(domainId: string) {
  const { user } = await session();
  await removeSendingDomain(user.id, domainId);
  revalidatePath("/app", "layout");
}

/** Permanently deletes the user and everything they own. */
export async function deleteAccount(_: unknown, form: FormData) {
  const { user, db } = await session();
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: 'Type DELETE to confirm.' };
  }
  const { data: domains } = await db.from("sending_domains").select("id").eq("user_id", user.id);
  for (const d of domains ?? []) await removeSendingDomain(user.id, d.id);
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return { error: "Couldn't delete the account. Please contact support." };
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
