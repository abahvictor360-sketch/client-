import { redirect } from "next/navigation";
import { formatUsd, PRICE_PER_EMAIL_CENTS, TOP_UP_OPTIONS_CENTS } from "@/lib/pricing";
import { stripeClient } from "@/lib/stripe";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Billing" };

const REASONS: Record<string, string> = {
  signup_bonus: "Free signup credits",
  top_up: "Top-up",
  email: "Email sent",
  ai_reply: "AI reply sent",
  refund_failed_email: "Refund: email not sent",
  refund_failed_reply: "Refund: reply not sent",
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const { paid } = await searchParams;
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: account } = await supabase.from("accounts").select("credits_cents").eq("user_id", user.id).single();
  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("id, amount_cents, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const billingEnabled = stripeClient() !== null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-medium tracking-tight">Billing</h1>
      {paid && <p className="rounded-lg bg-accent-soft px-4 py-3 text-sm">Payment received. Credits appear within a few seconds.</p>}

      <section className="card p-6">
        <p className="text-sm text-muted">Balance</p>
        <p className="mt-1 text-4xl font-medium">{formatUsd(account?.credits_cents ?? 0)}</p>
        <p className="mt-1 text-sm text-muted">
          ≈ {Math.floor((account?.credits_cents ?? 0) / PRICE_PER_EMAIL_CENTS)} emails at {formatUsd(PRICE_PER_EMAIL_CENTS)} each
        </p>
        {billingEnabled ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {TOP_UP_OPTIONS_CENTS.map((amount) => (
              <form key={amount} action="/api/billing/checkout" method="post">
                <input type="hidden" name="amount_cents" value={amount} />
                <button className="btn-secondary">Add {formatUsd(amount)}</button>
              </form>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Top-ups are disabled until STRIPE_SECRET_KEY is configured.</p>
        )}
      </section>

      <section className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(ledger ?? []).map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-muted">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">{REASONS[row.reason] ?? row.reason}</td>
                <td className={`px-4 py-3 text-right ${row.amount_cents > 0 ? "text-accent" : ""}`}>
                  {row.amount_cents > 0 ? "+" : "−"}{formatUsd(Math.abs(row.amount_cents))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
