"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { analyzeBusiness } from "@/lib/agent/analyze";
import { missingSenderFields } from "@/lib/email";
import { missingAnalysisConfig } from "@/lib/env";
import { trialStatus } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";
import { normalizeWebsite } from "@/lib/website";

async function session() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Loads a business through RLS, which proves the caller owns it. */
async function ownedBusiness(id: string) {
  const { supabase, user } = await session();
  const { data } = await supabase.from("businesses").select("id, status").eq("id", id).single();
  if (!data) throw new Error("Not found");
  return { supabase, user, business: data };
}

function configError() {
  const missing = missingAnalysisConfig();
  return missing.length
    ? `The agent isn't set up yet: ${missing.join(" and ")} must be set on the server. Please try again later.`
    : null;
}

export async function createBusiness(_: unknown, form: FormData) {
  const { supabase, user } = await session();
  const notReady = configError();
  if (notReady) return { error: notReady };
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
  const { data, error } = await supabase
    .from("businesses")
    .insert({ user_id: user.id, website, description: about || null })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create campaign" };

  after(() => analyzeBusiness(data.id).catch((err) => console.error("Analysis failed", err)));
  redirect(`/app/b/${data.id}`);
}

export async function reanalyzeBusiness(id: string) {
  const { supabase } = await ownedBusiness(id);
  if (configError()) return;
  await supabase
    .from("businesses")
    .update({ status: "analyzing", error: null, analysis_started_at: new Date().toISOString() })
    .eq("id", id);
  after(() => analyzeBusiness(id).catch((err) => console.error("Analysis failed", err)));
  revalidatePath(`/app/b/${id}`);
}

export async function setBusinessRunning(id: string, running: boolean) {
  const { supabase, user, business } = await ownedBusiness(id);
  if (running) {
    if (business.status === "analyzing" || business.status === "failed") {
      return { error: "Wait for the analysis to finish first." };
    }
    const { data: account } = await supabase.from("accounts").select("*").eq("user_id", user.id).single<Account>();
    const missing = account ? missingSenderFields(account) : ["account"];
    if (missing.length) return { error: `Add your ${missing.join(", ")} in Settings before starting.` };
    if (!trialStatus(account?.trial_ends_at).active && (account?.credits_cents ?? 0) <= 0) {
      return { error: "Your free trial has ended. Add credits to keep the agent running." };
    }
  }
  await supabase.from("businesses").update({ status: running ? "running" : "paused" }).eq("id", id);
  revalidatePath(`/app/b/${id}`);
  return {};
}

export async function updateBusinessLimits(id: string, form: FormData) {
  const { supabase } = await ownedBusiness(id);
  const budget = Math.round(Number(form.get("daily_budget")) * 100);
  const maxPerDay = Math.round(Number(form.get("max_emails_per_day")));
  if (!Number.isFinite(budget) || budget < 0 || !Number.isFinite(maxPerDay) || maxPerDay < 0 || maxPerDay > 500) {
    return;
  }
  await supabase
    .from("businesses")
    .update({ daily_budget_cents: budget, max_emails_per_day: maxPerDay })
    .eq("id", id);
  revalidatePath(`/app/b/${id}`);
}

export async function setSegmentStatus(businessId: string, segmentId: string, status: "testing" | "paused") {
  const { supabase } = await ownedBusiness(businessId);
  await supabase.from("segments").update({ status }).eq("id", segmentId).eq("business_id", businessId);
  revalidatePath(`/app/b/${businessId}`);
}

export async function updateAccount(_: unknown, form: FormData) {
  const { supabase, user } = await session();
  const text = (key: string) => {
    const value = String(form.get(key) ?? "").trim();
    return value || null;
  };
  const hours = (key: string, fallback: number) => {
    const n = Number(form.get(key));
    return Number.isInteger(n) ? n : fallback;
  };
  const timezone = text("timezone") ?? "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return { error: `Unknown timezone "${timezone}"` };
  }
  const start = hours("working_hours_start", 9);
  const end = hours("working_hours_end", 17);
  if (start < 0 || end > 24 || end <= start + 1) return { error: "Working hours must span at least two hours." };

  const { error } = await supabase
    .from("accounts")
    .update({
      company_name: text("company_name"),
      sender_name: text("sender_name"),
      sender_title: text("sender_title"),
      sender_email: text("sender_email")?.toLowerCase() ?? null,
      postal_address: text("postal_address"),
      timezone,
      working_hours_start: start,
      working_hours_end: end,
      meeting_minutes: hours("meeting_minutes", 30),
      meeting_link: text("meeting_link"),
    })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/app", "layout");
  return { message: "Saved" };
}
