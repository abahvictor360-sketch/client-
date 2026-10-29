"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { analyzeBusiness } from "@/lib/agent/analyze";
import { runAgentTick } from "@/lib/agent/run";
import { removeSendingDomain } from "@/lib/domains";
import { adminClient } from "@/lib/supabase/admin";

type Result = { error?: string; message?: string } | undefined;

/** Every admin change is recorded with who made it. */
async function audit(adminId: string, action: string, target: string | null, details: Record<string, unknown> = {}) {
  await adminClient().from("admin_actions").insert({ admin_id: adminId, action, target, details });
}

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function grantCredits(userId: string, _: Result, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const dollars = Number(form.get("amount"));
  if (!Number.isFinite(dollars) || dollars === 0 || Math.abs(dollars) > 10_000) {
    return { error: "Enter an amount between -$10,000 and $10,000 (not zero)." };
  }
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  const { data, error } = await adminClient().rpc("apply_credits", {
    p_user_id: userId,
    p_amount_cents: Math.round(dollars * 100),
    p_reason: dollars > 0 ? "admin_grant" : "admin_deduct",
    p_ref: `${admin.id}:${Date.now()}`,
  });
  if (error) return { error: error.message };
  if (data === "insufficient") return { error: "That would take the balance below $0." };
  await audit(admin.id, dollars > 0 ? "credits.add" : "credits.remove", userId, { dollars, note });
  refresh();
  return { message: dollars > 0 ? "Credits added" : "Credits removed" };
}

export async function extendTrial(userId: string, days: number) {
  const admin = await requireAdmin();
  const db = adminClient();
  const { data } = await db.from("accounts").select("trial_ends_at").eq("user_id", userId).single();
  if (!data) return;
  // Extend from now if the trial already ended, otherwise from its current end.
  const base = Math.max(Date.now(), new Date(data.trial_ends_at).getTime());
  const endsAt = new Date(base + days * 86_400_000).toISOString();
  await db.from("accounts").update({ trial_ends_at: endsAt }).eq("user_id", userId);
  await audit(admin.id, "trial.extend", userId, { days, ends_at: endsAt });
  refresh();
}

export async function endTrial(userId: string) {
  const admin = await requireAdmin();
  await adminClient().from("accounts").update({ trial_ends_at: new Date().toISOString() }).eq("user_id", userId);
  await audit(admin.id, "trial.end", userId);
  refresh();
}

export async function setSuspended(userId: string, suspended: boolean) {
  const admin = await requireAdmin();
  if (admin.id === userId) return;
  const db = adminClient();
  await db.from("accounts").update({ suspended }).eq("user_id", userId);
  // Suspending stops all sending immediately.
  if (suspended) await db.from("businesses").update({ status: "paused" }).eq("user_id", userId).eq("status", "running");
  await audit(admin.id, suspended ? "user.suspend" : "user.unsuspend", userId);
  refresh();
}

export async function setAdmin(userId: string, makeAdmin: boolean) {
  const admin = await requireAdmin();
  if (admin.id === userId && !makeAdmin) return; // Don't lock yourself out.
  await adminClient().from("accounts").update({ is_admin: makeAdmin }).eq("user_id", userId);
  await audit(admin.id, makeAdmin ? "user.make_admin" : "user.remove_admin", userId);
  refresh();
}

export async function deleteUser(userId: string, _: Result, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  if (admin.id === userId) return { error: "You can't delete your own account here." };
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
  const db = adminClient();
  const { data: user } = await db.auth.admin.getUserById(userId);
  const { data: domains } = await db.from("sending_domains").select("id").eq("user_id", userId);
  for (const d of domains ?? []) await removeSendingDomain(userId, d.id);
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  await audit(admin.id, "user.delete", userId, { email: user.user?.email });
  refresh();
  redirect("/admin?tab=users");
}

export async function setCampaignPaused(businessId: string, paused: boolean) {
  const admin = await requireAdmin();
  const db = adminClient();
  if (paused) {
    await db.from("businesses").update({ status: "paused" }).eq("id", businessId).eq("status", "running");
  } else {
    await db.from("businesses").update({ status: "running" }).eq("id", businessId).eq("status", "paused");
  }
  await audit(admin.id, paused ? "campaign.pause" : "campaign.resume", businessId);
  refresh();
}

export async function rerunAnalysis(businessId: string) {
  const admin = await requireAdmin();
  await adminClient()
    .from("businesses")
    .update({ status: "analyzing", error: null, analysis_started_at: new Date().toISOString() })
    .eq("id", businessId);
  after(() => analyzeBusiness(businessId).catch((err) => console.error("Analysis failed", err)));
  await audit(admin.id, "campaign.reanalyze", businessId);
  refresh();
}

export async function deleteCampaign(businessId: string) {
  const admin = await requireAdmin();
  await adminClient().from("businesses").delete().eq("id", businessId);
  await audit(admin.id, "campaign.delete", businessId);
  refresh();
  redirect("/admin?tab=campaigns");
}

export async function runAgentNow(): Promise<Result> {
  const admin = await requireAdmin();
  const results = await runAgentTick("admin");
  await audit(admin.id, "agent.run_now", null, { businesses: Object.keys(results).length });
  refresh();
  return { message: `Agent ran for ${Object.keys(results).length} running campaign(s).` };
}

export async function addSuppression(_: Result, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const db = adminClient();
  await db.from("suppressions").upsert({ email, reason: "admin" });
  await db.from("prospects").update({ status: "unsubscribed", next_action_at: null }).eq("email", email);
  await audit(admin.id, "suppression.add", email);
  refresh();
  return { message: `${email} will never be emailed.` };
}

export async function removeSuppression(email: string) {
  const admin = await requireAdmin();
  await adminClient().from("suppressions").delete().eq("email", email);
  await audit(admin.id, "suppression.remove", email);
  refresh();
}

export async function adminRemoveDomain(userId: string, domainId: string) {
  const admin = await requireAdmin();
  await removeSendingDomain(userId, domainId);
  await audit(admin.id, "domain.remove", domainId, { user_id: userId });
  refresh();
}
