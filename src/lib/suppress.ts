import { adminClient } from "@/lib/supabase/admin";

/** Stops all future email to a prospect's address, across every business. */
export async function suppressProspect(prospectId: string, reason: string) {
  const db = adminClient();
  const { data: prospect } = await db.from("prospects").select("email").eq("id", prospectId).maybeSingle();
  if (!prospect) return false;
  await db.from("suppressions").upsert({ email: prospect.email, reason });
  const status = reason === "bounce" ? "bounced" : "unsubscribed";
  await db.from("prospects").update({ status, next_action_at: null }).eq("email", prospect.email);
  return true;
}
