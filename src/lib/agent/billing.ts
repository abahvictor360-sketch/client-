import { adminClient } from "@/lib/supabase/admin";

export type ChargeResult = "ok" | "trial" | "duplicate" | "insufficient";

/**
 * Pays for one billable action. During the free trial it is recorded at $0
 * ("trial"); afterwards it debits credits ("ok"). `ref` makes it idempotent:
 * the same (reason, ref) is never charged twice ("duplicate"). Nothing is
 * charged when the trial is over and the balance is too low ("insufficient").
 */
export async function charge(userId: string, cents: number, reason: string, ref: string): Promise<ChargeResult> {
  const { data, error } = await adminClient().rpc("charge_usage", {
    p_user_id: userId,
    p_amount_cents: cents,
    p_reason: reason,
    p_ref: ref,
  });
  if (error) throw new Error(`Credit charge failed: ${error.message}`);
  return data as ChargeResult;
}

export async function refund(userId: string, cents: number, reason: string, ref: string) {
  await adminClient().rpc("apply_credits", {
    p_user_id: userId,
    p_amount_cents: cents,
    p_reason: reason,
    p_ref: ref,
  });
}
