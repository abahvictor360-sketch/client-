import { redirect } from "next/navigation";
import { formatUsd, PRICE_PER_EMAIL_CENTS, TOP_UP_OPTIONS_CENTS, trialStatus } from "@/lib/pricing";
import { stripeClient } from "@/lib/stripe";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Billing" };

const REASONS: Record<string, string> = {
  signup_bonus: "Free signup credits",
  trial_email: "Email sent (free trial)",
  trial_ai_reply: "Reply sent (free trial)",
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
  const { data: account } = await supabase
    .from("accounts")
    .select("credits_cents, trial_ends_at")
    .eq("user_id", user.id)
    .single();
  const trial = trialStatus(account?.trial_ends_at);
  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("id, amount_cents, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const balance = account?.credits_cents ?? 0;
  const billingEnabled = stripeClient() !== null;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
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
        {trial.active ? (
          <div className="mb-6 rounded-[var(--radius-control)] bg-teal-soft p-4 text-sm text-teal-ink">
            <p className="font-semibold">
              Free trial: {trial.daysLeft} {trial.daysLeft === 1 ? "day" : "days"} left
            </p>
            <p className="mt-0.5">
              Everything the agent sends is free until{" "}
              {trial.endsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC. No card
              or subscription needed. Add credits any time to keep it running afterwards.
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded-[var(--radius-control)] bg-surface-2 p-4 text-sm">
            <p className="font-semibold">Your free trial has ended</p>
            <p className="mt-0.5 text-muted">The agent now uses credits. There&apos;s still no subscription: you only pay per email.</p>
          </div>
        )}
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
            Online card payments aren&apos;t available yet.{" "}
            {supportEmail ? (
              <>
                To add credits, email{" "}
                <a href={`mailto:${supportEmail}?subject=Add%20Leadloop%20credits`} className="font-semibold text-ink underline underline-offset-4">
                  {supportEmail}
                </a>{" "}
                and we&apos;ll top up your account.
              </>
            ) : (
              "Contact the team to add credits to your account."
            )}
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
