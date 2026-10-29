"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";

type Result = { error?: string; message?: string } | undefined;

export async function grantCredits(userId: string, _: Result, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const dollars = Number(form.get("amount"));
  if (!Number.isFinite(dollars) || dollars === 0 || Math.abs(dollars) > 10_000) {
    return { error: "Enter an amount between -$10,000 and $10,000 (not zero)." };
  }
  const { data, error } = await adminClient().rpc("apply_credits", {
    p_user_id: userId,
    p_amount_cents: Math.round(dollars * 100),
    p_reason: dollars > 0 ? "admin_grant" : "admin_deduct",
    p_ref: `${admin.id}:${Date.now()}`,
  });
  if (error) return { error: error.message };
  if (data === "insufficient") return { error: "That would take the balance below $0." };
  revalidatePath("/admin");
  return { message: dollars > 0 ? "Credits added" : "Credits removed" };
}

export async function extendTrial(userId: string, days: number) {
  await requireAdmin();
  const db = adminClient();
  const { data } = await db.from("accounts").select("trial_ends_at").eq("user_id", userId).single();
  if (!data) return;
  // Extend from now if the trial already ended, otherwise from its current end.
  const base = Math.max(Date.now(), new Date(data.trial_ends_at).getTime());
  await db
    .from("accounts")
    .update({ trial_ends_at: new Date(base + days * 86_400_000).toISOString() })
    .eq("user_id", userId);
  revalidatePath("/admin");
}

export async function endTrial(userId: string) {
  await requireAdmin();
  await adminClient().from("accounts").update({ trial_ends_at: new Date().toISOString() }).eq("user_id", userId);
  revalidatePath("/admin");
}

export async function setCampaignPaused(businessId: string, paused: boolean) {
  await requireAdmin();
  const db = adminClient();
  if (paused) {
    await db.from("businesses").update({ status: "paused" }).eq("id", businessId).eq("status", "running");
  } else {
    await db.from("businesses").update({ status: "running" }).eq("id", businessId).eq("status", "paused");
  }
  revalidatePath("/admin");
}

export async function setAdmin(userId: string, makeAdmin: boolean) {
  const admin = await requireAdmin();
  if (admin.id === userId && !makeAdmin) return; // Don't lock yourself out.
  await adminClient().from("accounts").update({ is_admin: makeAdmin }).eq("user_id", userId);
  revalidatePath("/admin");
}
