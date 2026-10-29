import { env } from "@/lib/env";
import { adminClient } from "@/lib/supabase/admin";

const API = "https://api.flutterwave.com/v3";

/** Null when Flutterwave isn't configured; the Billing page then hides it. */
export function flutterwaveSecret() {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  return key && key !== "REPLACE_ME" ? key : null;
}

/** Currency customers are charged in. Credits are kept in USD cents. */
export function flutterwaveCurrency() {
  return (process.env.FLUTTERWAVE_CURRENCY || "USD").toUpperCase();
}

/** Units of the charge currency per 1 USD (e.g. 1600 for NGN). 1 for USD. */
export function flutterwaveRate() {
  if (flutterwaveCurrency() === "USD") return 1;
  const rate = Number(process.env.FLUTTERWAVE_USD_RATE);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Set FLUTTERWAVE_USD_RATE for non-USD Flutterwave charges");
  return rate;
}

/** What a top-up of `usdCents` costs in the charge currency, e.g. "NGN 32,000". */
export function chargeLabel(usdCents: number) {
  const amount = (usdCents / 100) * flutterwaveRate();
  return new Intl.NumberFormat("en-US", { style: "currency", currency: flutterwaveCurrency(), maximumFractionDigits: 0 }).format(amount);
}

async function flw<T>(path: string, init?: RequestInit): Promise<T> {
  const secret = flutterwaveSecret();
  if (!secret) throw new Error("Flutterwave is not configured");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json().catch(() => ({}))) as T & { status?: string; message?: string };
  if (!response.ok || body.status !== "success") {
    throw new Error(`Flutterwave ${path} failed: ${body.message ?? response.status}`);
  }
  return body;
}

/** Starts a hosted Flutterwave checkout and returns the URL to send the customer to. */
export async function createFlutterwaveCheckout(opts: { userId: string; email: string; amountCents: number }) {
  const txRef = `ll_${opts.userId}_${opts.amountCents}_${Date.now()}`;
  const result = await flw<{ data: { link: string } }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: txRef,
      amount: Math.round((opts.amountCents / 100) * flutterwaveRate() * 100) / 100,
      currency: flutterwaveCurrency(),
      redirect_url: `${env.appUrl()}/api/billing/flutterwave/callback`,
      customer: { email: opts.email },
      customizations: { title: `${env.appName()} credits`, description: "Prepaid credits for your outbound agent" },
      meta: { user_id: opts.userId, amount_cents: opts.amountCents },
    }),
  });
  return result.data.link;
}

interface VerifiedTransaction {
  id: number;
  tx_ref: string;
  status: string;
  amount: number;
  currency: string;
}

/**
 * Verifies a transaction with Flutterwave (never trusting redirect or webhook
 * data alone) and credits the account once. Returns what happened.
 */
export async function settleFlutterwaveTransaction(transactionId: string | number) {
  const { data: tx } = await flw<{ data: VerifiedTransaction }>(`/transactions/${encodeURIComponent(String(transactionId))}/verify`);

  // tx_ref was created by us: ll_<userId>_<amountCents>_<timestamp>
  const match = /^ll_([0-9a-f-]{36})_(\d+)_\d+$/.exec(tx.tx_ref);
  if (!match) return { ok: false as const, reason: "unknown_reference" };
  const [, userId, expectedCentsRaw] = match;
  const expectedCents = Number(expectedCentsRaw);

  if (tx.status !== "successful") return { ok: false as const, reason: "not_successful" };
  if (tx.currency.toUpperCase() !== flutterwaveCurrency()) return { ok: false as const, reason: "wrong_currency" };
  const expectedCharge = (expectedCents / 100) * flutterwaveRate();
  if (tx.amount + 0.01 < expectedCharge) return { ok: false as const, reason: "underpaid" };

  // Credits are USD cents; with a non-USD currency the top-up option's USD value is credited.
  const { data, error } = await adminClient().rpc("apply_credits", {
    p_user_id: userId,
    p_amount_cents: expectedCents,
    p_reason: "top_up",
    p_ref: `flw_${tx.id}`,
  });
  if (error) throw new Error(`Crediting failed: ${error.message}`);
  return { ok: true as const, userId, amountCents: expectedCents, duplicate: data === "duplicate" };
}
