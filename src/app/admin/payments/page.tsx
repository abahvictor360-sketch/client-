import Link from "next/link";
import { adminDateTime, loadUsers } from "@/lib/admin-data";
import { formatUsd } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Payments" };

const TYPES: Record<string, string> = {
  top_up: "Payment",
  admin_grant: "Added by admin",
  admin_deduct: "Removed by admin",
};

export default async function AdminPayments() {
  const [{ emailById }, ledger] = await Promise.all([
    loadUsers(),
    adminClient()
      .from("credit_ledger")
      .select("*")
      .in("reason", Object.keys(TYPES))
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const rows = ledger.data ?? [];
  const paid = rows.filter((r) => r.reason === "top_up");

  return (
    <>
      <div>
        <h1 className="text-3xl sm:text-4xl">Payments</h1>
        <p className="mt-2 text-muted">
          {formatUsd(paid.reduce((s, r) => s + r.amount_cents, 0))} from {paid.length} payment(s). Credit changes made by admins
          are listed too.
        </p>
      </div>
      <section aria-label="Payments" className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">User</th>
              <th scope="col">Type</th>
              <th scope="col">Provider / reference</th>
              <th scope="col" className="!text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-muted">{adminDateTime.format(new Date(r.created_at))}</td>
                <td><Link href={`/admin/users/${r.user_id}`} className="underline-offset-4 hover:underline [overflow-wrap:anywhere]">{emailById.get(r.user_id)}</Link></td>
                <td>{TYPES[r.reason]}</td>
                <td className="max-w-56 truncate text-muted">
                  {r.reason === "top_up" ? (r.ref?.startsWith("flw_") ? `Flutterwave ${r.ref.slice(4)}` : `Stripe ${r.ref}`) : "Admin"}
                </td>
                <td className={`text-right ${r.amount_cents > 0 ? "text-success" : ""}`}>
                  {r.amount_cents > 0 ? "+" : "−"}{formatUsd(Math.abs(r.amount_cents))}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="!py-12 text-center text-muted">No payments yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
