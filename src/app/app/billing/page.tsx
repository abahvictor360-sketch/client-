import { redirect } from "next/navigation";
import { formatUsd, PRICE_PER_EMAIL_CENTS, TOP_UP_OPTIONS_CENTS } from "@/lib/pricing";
import { stripeClient } from "@/lib/stripe";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Billing" };

const REASONS: Record<string, string> = {
  signup_bonus: "Free signup credits",
  top_up: "Credits added",
  email: "Email sent",
  ai_reply: "Reply sent",
  refund_failed_email: "Refund for an email that didn't send",
  refund_failed_reply: "Refund for a reply that didn't send",
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
  const balance = account?.credits_cents ?? 0;
  const billingEnabled = stripeClient() !== null;
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl">Billing</h1>
        <p className="mt-2 text-muted">{formatUsd(PRICE_PER_EMAIL_CENTS)} per email or reply sent. Nothing else is charged.</p>
      </div>
      {paid && (
        <p role="status" className="rounded-[var(--radius-control)] bg-success-soft px-4 py-3 text-sm text-success">
          Payment received. Your credits will appear in a few seconds.
        </p>
      )}

      <section className="panel p-6 sm:p-8">
        <p className="text-sm text-muted">Balance</p>
        <p className="mt-1 font-display text-5xl font-semibold tabular-nums">{formatUsd(balance)}</p>
        <p className="mt-1 text-sm text-muted">
          Enough for about {Math.floor(balance / PRICE_PER_EMAIL_CENTS).toLocaleString("en-US")} emails
        </p>
        {billingEnabled ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {TOP_UP_OPTIONS_CENTS.map((amount) => (
              <form key={amount} action="/api/billing/checkout" method="post">
                <input type="hidden" name="amount_cents" value={amount} />
                <button className="btn-secondary tabular-nums">Add {formatUsd(amount)}</button>
              </form>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">
            Top-ups turn on once STRIPE_SECRET_KEY is set for this deployment.
          </p>
        )}
      </section>

      <section aria-labelledby="history-title">
        <h2 id="history-title" className="text-xl">History</h2>
        <div className="panel mt-3 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col" className="!text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(ledger ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-muted">{date.format(new Date(row.created_at))}</td>
                  <td>{REASONS[row.reason] ?? row.reason}</td>
                  <td className={`text-right ${row.amount_cents > 0 ? "text-success" : ""}`}>
                    {row.amount_cents > 0 ? "+" : "−"}
                    {formatUsd(Math.abs(row.amount_cents))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
