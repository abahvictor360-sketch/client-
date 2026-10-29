import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, Minus } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { requireAdmin } from "@/lib/admin";
import { adminDate, adminDateTime, loadSetupProgress, SETUP_STEPS } from "@/lib/admin-data";
import { formatUsd, trialStatus } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";
import type { Account, Business } from "@/lib/types";
import { endTrial, extendTrial, setAdmin, setSuspended } from "../../actions";
import { ConfirmButton, DeleteUserForm, GrantCreditsForm } from "../../ui";

export const metadata = { title: "User" };

const REASONS: Record<string, string> = {
  signup_bonus: "Signup credits",
  top_up: "Payment",
  admin_grant: "Added by admin",
  admin_deduct: "Removed by admin",
  email: "Email sent",
  ai_reply: "Reply sent",
  trial_email: "Email (trial)",
  trial_ai_reply: "Reply (trial)",
  refund_failed_email: "Refund (email failed)",
  refund_failed_reply: "Refund (reply failed)",
};

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const db = adminClient();
  const { data: auth } = await db.auth.admin.getUserById(id);
  if (!auth.user) notFound();
  const user = auth.user;

  const [account, businesses, ledger, domains, progressMap, suppressions] = await Promise.all([
    db.from("accounts").select("*").eq("user_id", id).single<Account & { created_at: string }>(),
    db.from("businesses").select("*").eq("user_id", id).order("created_at", { ascending: false }).returns<Business[]>(),
    db.from("credit_ledger").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("sending_domains").select("domain, status").eq("user_id", id),
    loadSetupProgress(),
    db.from("user_suppressions").select("value, created_at", { count: "exact" }).eq("user_id", id).order("created_at", { ascending: false }).limit(60),
  ]);
  const progress = progressMap.get(id);
  const a = account.data;
  const trial = trialStatus(a?.trial_ends_at);
  const self = me.id === id;

  return (
    <>
      <div>
        <Link href="/admin/users" className="btn-quiet -ml-3"><ChevronLeft size={16} aria-hidden="true" />Users</Link>
        <h1 className="mt-2 text-3xl [overflow-wrap:anywhere]">{user.email}</h1>
        <p className="mt-1 text-muted">
          Joined {adminDate.format(new Date(user.created_at))} ·{" "}
          {user.email_confirmed_at ? "email confirmed" : "email not confirmed"} · last sign-in{" "}
          {user.last_sign_in_at ? adminDateTime.format(new Date(user.last_sign_in_at)) : "never"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {a?.is_admin && <span className="pill bg-ink text-canvas">Admin</span>}
          {a?.suspended && <span className="pill bg-surface-2 text-danger">Suspended</span>}
          <span className={`pill ${trial.active ? "bg-success-soft text-success" : "bg-surface-2 text-muted"}`}>
            {trial.active ? `Trial: ${trial.daysLeft}d left` : "Trial ended"}
          </span>
          <span className="pill bg-surface-2">{formatUsd(a?.credits_cents ?? 0)} credits</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="panel space-y-4 p-6" aria-labelledby="credits-title">
          <h2 id="credits-title" className="text-xl">Credits and trial</h2>
          <GrantCreditsForm userId={id} />
          <div className="flex flex-wrap gap-1 border-t border-line pt-4">
            <ConfirmButton action={extendTrial.bind(null, id, 3)} label="+3 days trial" />
            <ConfirmButton action={extendTrial.bind(null, id, 7)} label="+7 days trial" />
            {trial.active && <ConfirmButton action={endTrial.bind(null, id)} label="End trial now" confirmText="End this user's free trial now?" />}
          </div>
        </section>

        <section className="panel space-y-3 p-6 text-sm" aria-labelledby="sender-title">
          <h2 id="sender-title" className="text-xl">Sender settings</h2>
          <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted">Name</dt><dd>{a?.sender_name ?? "–"} {a?.sender_title ? `(${a.sender_title})` : ""}</dd>
            <dt className="text-muted">Company</dt><dd>{a?.company_name ?? "–"}</dd>
            <dt className="text-muted">Sends from</dt><dd className="[overflow-wrap:anywhere]">{a?.sender_email ?? "–"}</dd>
            <dt className="text-muted">Postal address</dt><dd>{a?.postal_address ?? "–"}</dd>
            <dt className="text-muted">Timezone</dt><dd>{a?.timezone} ({a?.working_hours_start}:00–{a?.working_hours_end}:00)</dd>
            <dt className="text-muted">Domains</dt>
            <dd>{domains.data?.length ? domains.data.map((d) => `${d.domain} (${d.status})`).join(", ") : "None"}</dd>
          </dl>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="panel p-6" aria-labelledby="setup-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="setup-title" className="text-xl">Onboarding</h2>
            <span className="text-sm text-muted">{progress?.done ?? 0} of {SETUP_STEPS.length} steps</span>
          </div>
          <ol className="mt-4 space-y-2 text-sm">
            {SETUP_STEPS.map((step) => {
              const done = Boolean(progress?.[step.key]);
              return (
                <li key={step.key} className="flex items-center gap-2.5">
                  <span className={`grid h-5 w-5 place-items-center rounded-full ${done ? "bg-teal text-white dark:text-[#0b1f1b]" : "bg-surface-2 text-muted"}`}>
                    {done ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />}
                  </span>
                  <span className={done ? "" : "text-muted"}>{step.label}</span>
                  <span className="sr-only">{done ? "(done)" : "(not yet)"}</span>
                </li>
              );
            })}
          </ol>
          <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 border-t border-line pt-4 text-sm">
            <dt className="text-muted">Found us via</dt><dd>{a?.heard_from ?? "Not answered"}</dd>
            <dt className="text-muted">Checklist</dt><dd>{a?.onboarding_dismissed_at ? `Hidden ${adminDate.format(new Date(a.onboarding_dismissed_at))}` : "Showing"}</dd>
          </dl>
        </section>

        <section className="panel p-6" aria-labelledby="usuppress-title">
          <h2 id="usuppress-title" className="text-xl">Suppress list <span className="text-muted">({suppressions.count ?? 0})</span></h2>
          <p className="mt-1 text-sm text-muted">Emails and domains this user told the agent never to contact.</p>
          {suppressions.data?.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {suppressions.data.map((x) => <li key={x.value} className="pill bg-surface-2 font-mono text-ink">{x.value}</li>)}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Empty.</p>
          )}
        </section>
      </div>

      <section className="panel overflow-x-auto" aria-labelledby="ucampaigns-title">
        <h2 id="ucampaigns-title" className="px-6 pt-5 text-xl">Businesses</h2>
        <table className="data-table mt-2">
          <thead><tr><th scope="col">Business</th><th scope="col">Status</th><th scope="col">Setup</th><th scope="col">Created</th></tr></thead>
          <tbody>
            {(businesses.data ?? []).map((b) => (
              <tr key={b.id}>
                <td><Link href={`/admin/campaigns/${b.id}`} className="font-semibold underline-offset-4 hover:underline">{b.name ?? b.website ?? "Untitled"}</Link></td>
                <td><StatusPill status={b.status} /></td>
                <td className="text-muted">{b.confirmed_at ? "Confirmed" : b.status === "ready" ? "In setup steps" : "–"}</td>
                <td className="text-muted">{adminDate.format(new Date(b.created_at))}</td>
              </tr>
            ))}
            {!businesses.data?.length && <tr><td colSpan={4} className="!py-8 text-center text-muted">No businesses.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="panel overflow-x-auto" aria-labelledby="uledger-title">
        <h2 id="uledger-title" className="px-6 pt-5 text-xl">Billing history</h2>
        <table className="data-table mt-2">
          <thead><tr><th scope="col">When</th><th scope="col">What</th><th scope="col" className="!text-right">Amount</th></tr></thead>
          <tbody>
            {(ledger.data ?? []).map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-muted">{adminDateTime.format(new Date(l.created_at))}</td>
                <td>{REASONS[l.reason] ?? l.reason}</td>
                <td className={`text-right ${l.amount_cents > 0 ? "text-success" : ""}`}>
                  {l.amount_cents > 0 ? "+" : l.amount_cents < 0 ? "−" : ""}{formatUsd(Math.abs(l.amount_cents))}
                </td>
              </tr>
            ))}
            {!ledger.data?.length && <tr><td colSpan={3} className="!py-8 text-center text-muted">No activity.</td></tr>}
          </tbody>
        </table>
      </section>

      {!self && (
        <section className="panel space-y-4 border-danger/30 p-6" aria-labelledby="uaccess-title">
          <h2 id="uaccess-title" className="text-xl">Access</h2>
          <div className="flex flex-wrap gap-1">
            <ConfirmButton
              action={setSuspended.bind(null, id, !a?.suspended)}
              label={a?.suspended ? "Unsuspend user" : "Suspend user"}
              confirmText={a?.suspended ? "Unsuspend this user?" : "Suspend this user? Their running campaigns are paused immediately."}
              danger={!a?.suspended}
            />
            <ConfirmButton
              action={setAdmin.bind(null, id, !a?.is_admin)}
              label={a?.is_admin ? "Remove admin" : "Make admin"}
              confirmText={a?.is_admin ? "Remove admin access?" : "Give this user full admin access?"}
            />
          </div>
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-sm text-muted">Deleting removes the user, their campaigns, prospects, conversations and domains permanently.</p>
            <DeleteUserForm userId={id} />
          </div>
        </section>
      )}
    </>
  );
}
