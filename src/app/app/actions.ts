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
  revalidatePath(`/app/b/${id}`);
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
  revalidatePath(`/app/b/${id}`);
  return {};
}

export async function updateBusinessLimits(id: string, _: unknown, form: FormData) {
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
  revalidatePath(`/app/b/${id}`);
  return { message: "Limits saved" };
}

export async function setSegmentStatus(businessId: string, segmentId: string, status: "testing" | "paused") {
  const { db } = await ownedBusiness(businessId);
  await db.from("segments").update({ status }).eq("id", segmentId).eq("business_id", businessId);
  revalidatePath(`/app/b/${businessId}`);
}

/** Stops all further emails to one prospect (their conversation is kept). */
export async function stopProspect(businessId: string, prospectId: string) {
  const { db } = await ownedBusiness(businessId);
  await db
    .from("prospects")
    .update({ status: "done", next_action_at: null })
    .eq("id", prospectId)
    .eq("business_id", businessId);
  revalidatePath(`/app/b/${businessId}`);
}

export async function deleteBusiness(id: string) {
  const { db } = await ownedBusiness(id);
  await db.from("businesses").delete().eq("id", id);
  revalidatePath("/app");
  redirect("/app");
}

export async function updateAccount(_: unknown, form: FormData) {
  const { user, db, account } = await session();
  if (account?.suspended) return { error: SUSPENDED };
  const text = (key: string, max = 300) => {
    const value = String(form.get(key) ?? "").trim().slice(0, max);
    return value || null;
  };
  const int = (key: string, fallback: number) => {
    const n = Number(form.get(key));
    return Number.isInteger(n) ? n : fallback;
  };
  const timezone = text("timezone", 64) ?? "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return { error: `Unknown timezone "${timezone}". Use a name like Europe/London or Africa/Lagos.` };
  }
  const senderEmail = text("sender_email", 254)?.toLowerCase() ?? null;
  if (senderEmail) {
    const problem = await senderProblem(user.id, senderEmail);
    if (problem) return { error: problem };
  }
  const start = int("working_hours_start", 9);
  const end = int("working_hours_end", 17);
  if (start < 0 || end > 24 || end <= start + 1) return { error: "Working hours must span at least two hours." };
  const minutes = int("meeting_minutes", 30);
  if (minutes < 10 || minutes > 180) return { error: "Meeting length must be between 10 and 180 minutes." };
  const meetingLink = text("meeting_link", 500);
  if (meetingLink && !/^https:\/\//i.test(meetingLink)) return { error: "The video call link must start with https://" };

  const { error } = await db
    .from("accounts")
    .update({
      company_name: text("company_name", 120),
      sender_name: text("sender_name", 120),
      sender_title: text("sender_title", 120),
      sender_email: senderEmail,
      postal_address: text("postal_address", 300),
      timezone,
      working_hours_start: start,
      working_hours_end: end,
      meeting_minutes: minutes,
      meeting_link: meetingLink,
    })
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't save settings. Please try again." };
  revalidatePath("/app", "layout");
  return { message: "Saved" };
}

export async function addDomain(_: unknown, form: FormData): Promise<{ error?: string; message?: string }> {
  const { user, account } = await session();
  if (account?.suspended) return { error: SUSPENDED };
  const result = await addSendingDomain(user.id, String(form.get("domain") ?? ""), Boolean(account?.is_admin));
  revalidatePath("/app/settings");
  return result;
}

export async function checkDomain(domainId: string): Promise<{ error?: string; message?: string }> {
  const { user } = await session();
  const result = await refreshSendingDomain(user.id, domainId);
  revalidatePath("/app/settings");
  return result;
}

export async function removeDomain(domainId: string) {
  const { user } = await session();
  await removeSendingDomain(user.id, domainId);
  revalidatePath("/app/settings");
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
