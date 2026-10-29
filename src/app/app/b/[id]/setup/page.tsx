import { ArrowRight, Check, ChevronLeft, CircleAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SendingDomain } from "@/lib/domains";
import { formatUsd, PRICE_PER_EMAIL_CENTS, TOP_UP_OPTIONS_CENTS, TRIAL_DAYS, TRIAL_MAX_EMAILS_PER_DAY, trialStatus } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import { saveSetupStep, setSegmentStatus } from "../../../actions";
import { DomainsPanel } from "../../../settings/domains";
import { ActionForm } from "../action-form";
import { CompetitorsEditor } from "../competitors";
import { AutoRefresh } from "../controls";
import { analysisStalled, businessLabel, getAccount, getBusiness, getSegments, hostOf } from "../data";
import { FactsFields, Field, ScheduleFields, SenderFields } from "../fields";
import { HEARD_FROM, SETUP_STEPS, setupHref, stepIndex } from "./steps";
import { LaunchButtons, NotUs } from "./ui";

export const maxDuration = 300;
export const metadata = { title: "Set up your campaign" };

function Continue({ href, label = "Continue" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="btn-primary">
      {label} <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

function Check2({ ok, children, fix }: { ok: boolean; children: React.ReactNode; fix?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${ok ? "bg-teal text-white dark:text-[#0b1f1b]" : "bg-surface-2 text-danger"}`}>
        {ok ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}
      </span>
      <span className="flex-1">
        {children}
        <span className="sr-only">{ok ? " (done)" : " (needs attention)"}</span>
      </span>
      {!ok && fix}
    </li>
  );
}

export default async function SetupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const { id } = await params;
  const index = stepIndex((await searchParams).step);
  const step = SETUP_STEPS[index];
  const [business, segments, account] = await Promise.all([getBusiness(id), getSegments(id), getAccount()]);
  if (!account) redirect("/app");
  if (business.status === "running") redirect(`/app/b/${id}`);

  const host = hostOf(business);
  const prev = SETUP_STEPS[index - 1];
  const next = SETUP_STEPS[index + 1];
  const back = prev && (
    <Link href={setupHref(id, prev.id)} className="btn-secondary">
      <ChevronLeft size={16} aria-hidden="true" /> Back
    </Link>
  );
  const analyzing = business.status === "analyzing" && !analysisStalled(business);
  const failed = business.status === "failed" || analysisStalled(business);
  const trial = trialStatus(account.trial_ends_at);

  let domains: SendingDomain[] = [];
  if (step.id === "mailbox" || step.id === "launch") {
    const { supabase } = await requireUser();
    domains = (await supabase.from("sending_domains").select("*").order("created_at").returns<SendingDomain[]>()).data ?? [];
  }
  const senderDomain = account.sender_email?.split("@")[1];
  const domainVerified = domains.some((d) => d.status === "verified" && d.domain === senderDomain);
  const liveSegments = segments.filter((s) => ["testing", "working", "scaling"].includes(s.status));

  return (
    <div className="mx-auto max-w-4xl">
      <AutoRefresh active={analyzing} />
      <article className="panel flex min-h-[38rem] flex-col p-5 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex min-w-0 items-center gap-2.5 font-semibold">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-soft text-sm text-teal-ink" aria-hidden="true">
              {businessLabel(business).charAt(0).toUpperCase()}
            </span>
            <span className="truncate" translate="no">{host ?? businessLabel(business)}</span>
          </p>
          <ol className="order-3 flex w-full items-center justify-center gap-1.5 sm:order-none sm:w-auto" aria-label="Setup progress">
            {SETUP_STEPS.map((s, i) => (
              <li key={s.id}>
                <Link
                  href={setupHref(id, s.id)}
                  aria-current={i === index ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  className={`block h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-ink" : i < index ? "w-1.5 bg-ink/60" : "w-1.5 bg-line"}`}
                />
              </li>
            ))}
          </ol>
          <p className="eyebrow tabular-nums">Step {index + 1} of {SETUP_STEPS.length}</p>
        </header>

        <h1 className="mt-8 text-3xl sm:text-4xl">{step.title}</h1>

        <div className="mt-6 flex flex-1 flex-col">
          {step.id === "company" && (
            <div className="flex flex-1 flex-col gap-6">
              {analyzing ? (
                <div role="status" className="flex items-center gap-3 rounded-[20px] bg-canvas p-5 ring-1 ring-line">
                  <Loader2 size={18} className="animate-spin text-teal motion-reduce:animate-none" aria-hidden="true" />
                  <p>{host ? `Reading ${host} and researching competitors…` : "Studying your description and researching competitors…"} <span className="text-muted">About a minute or two.</span></p>
                </div>
              ) : failed ? (
                <div role="alert" className="rounded-[20px] bg-canvas p-5 ring-1 ring-line">
                  <p className="font-semibold text-danger">We couldn&rsquo;t read your business</p>
                  <p className="mt-1 text-sm text-muted">{business.error ?? "The analysis took too long."} Describe your business below and we&rsquo;ll try again.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-teal-soft text-2xl font-semibold text-teal-ink" aria-hidden="true">
                      {businessLabel(business).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xl font-semibold">{businessLabel(business)}</p>
                      {host && <p className="font-mono text-sm text-muted" translate="no">{host}</p>}
                    </div>
                  </div>
                  <div>
                    <p className="eyebrow">What you do</p>
                    <p className="mt-2 text-lg">{business.summary}</p>
                  </div>
                  <CompetitorsEditor id={id} competitors={business.competitors} />
                </>
              )}
              <div className="mt-auto pt-4">
                {!analyzing && (
                  <NotUs id={id}>{!failed && <Continue href={setupHref(id, "buyers")} label="Yes, that’s us" />}</NotUs>
                )}
              </div>
            </div>
          )}

          {step.id === "buyers" && (
            <div className="flex flex-1 flex-col gap-4">
              <p className="text-muted">The kinds of businesses we&rsquo;ll reach out to, best fit first. Untick any you don&rsquo;t want. You can change this later in Targeting.</p>
              <ul className="space-y-2">
                {segments.map((s) => {
                  const on = s.status !== "paused" && s.status !== "exhausted";
                  return (
                    <li key={s.id}>
                      <form action={setSegmentStatus.bind(null, id, s.id, on ? "paused" : "testing")}>
                        <button
                          aria-pressed={on}
                          disabled={s.status === "exhausted"}
                          className={`flex w-full items-start gap-3 rounded-[16px] p-4 text-left ring-1 transition-colors ${on ? "bg-teal-soft/50 ring-teal" : "bg-surface ring-line hover:bg-surface-2"}`}
                        >
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md ${on ? "bg-teal text-white dark:text-[#0b1f1b]" : "ring-1 ring-line"}`}>
                            {on && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold">{s.name}</span>
                              <span className="text-xs text-muted">{s.fit_score}% fit</span>
                            </span>
                            <span className="mt-0.5 block text-sm text-muted">{s.rationale}</span>
                          </span>
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                {back}
                {liveSegments.length ? <Continue href={setupHref(id, "plan")} /> : <p className="text-sm text-danger">Keep at least one buyer type.</p>}
              </div>
            </div>
          )}

          {step.id === "plan" && (
            <div className="flex flex-1 flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`rounded-[20px] p-5 ring-1 ${trial.active ? "ring-2 ring-teal" : "ring-line"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-semibold">Free trial</p>
                    {trial.active && <span className="pill bg-teal-soft text-teal-ink">Current · {trial.daysLeft} {trial.daysLeft === 1 ? "day" : "days"} left</span>}
                  </div>
                  <p className="mt-2"><span className="text-3xl font-semibold">$0</span> <span className="text-muted">for {TRIAL_DAYS} days</span></p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {[`Up to ${TRIAL_MAX_EMAILS_PER_DAY} emails a day`, "Replies and meeting booking included", "No card, no subscription"].map((f) => (
                      <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-teal" aria-hidden="true" />{f}</li>
                    ))}
                  </ul>
                </div>
                <div className={`rounded-[20px] p-5 ring-1 ${!trial.active ? "ring-2 ring-teal" : "ring-line"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-semibold">Pay as you go</p>
                    {!trial.active && <span className="pill bg-teal-soft text-teal-ink">Current · {formatUsd(account.credits_cents)} left</span>}
                  </div>
                  <p className="mt-2"><span className="text-3xl font-semibold">{formatUsd(PRICE_PER_EMAIL_CENTS)}</span> <span className="text-muted">per email</span></p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {[`Top up from ${formatUsd(TOP_UP_OPTIONS_CENTS[0])}; credits never expire`, "Send up to 500 emails a day", "Set a daily budget so you never overspend"].map((f) => (
                      <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-teal" aria-hidden="true" />{f}</li>
                    ))}
                  </ul>
                  <Link href="/app/billing" className="btn-secondary mt-5 w-full">Top up</Link>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                {back}
                <Continue href={setupHref(id, "sender")} label="Continue" />
              </div>
            </div>
          )}

          {step.id === "sender" && (
            <ActionForm action={saveSetupStep.bind(null, id, "sender")} submitLabel={<>Continue <ArrowRight size={16} aria-hidden="true" /></>} secondary={back} className="flex flex-1 flex-col gap-5">
              <SenderFields account={account} />
              <div className="flex-1" />
            </ActionForm>
          )}

          {step.id === "mailbox" && (
            <div className="flex flex-1 flex-col gap-6">
              <p className="text-muted">Emails go out from a domain you own, so replies come straight back to you. Use a subdomain like <span className="font-mono">go.yourcompany.com</span> to protect your main domain.</p>
              <DomainsPanel domains={domains} />
              <ActionForm action={saveSetupStep.bind(null, id, "mailbox")} submitLabel={<>Continue <ArrowRight size={16} aria-hidden="true" /></>} secondary={back} className="flex flex-1 flex-col gap-5">
                <Field id="sender_email" label="Sending address" hint="Must be on a verified domain above.">
                  <input id="sender_email" name="sender_email" type="email" required autoComplete="email" spellCheck={false} className="input"
                    defaultValue={account.sender_email ?? ""} placeholder={`you@${domains.find((d) => d.status === "verified")?.domain ?? "go.yourcompany.com"}`} />
                </Field>
                <Field id="postal_address" label="Postal address" hint="Shown in every email footer, as anti-spam laws require.">
                  <input id="postal_address" name="postal_address" required autoComplete="street-address" className="input" defaultValue={account.postal_address ?? ""} />
                </Field>
                <div className="flex-1" />
              </ActionForm>
            </div>
          )}

          {step.id === "facts" && (
            <ActionForm action={saveSetupStep.bind(null, id, "facts")} submitLabel={<>Continue <ArrowRight size={16} aria-hidden="true" /></>} secondary={back} className="flex flex-1 flex-col gap-5">
              <p className="text-muted">When prospects ask about price or proof, the agent answers from this. All optional; leave blank anything you&rsquo;d rather discuss on a call.</p>
              <FactsFields business={business} />
              <div className="flex-1" />
            </ActionForm>
          )}

          {step.id === "schedule" && (
            <ActionForm action={saveSetupStep.bind(null, id, "schedule")} submitLabel={<>Continue <ArrowRight size={16} aria-hidden="true" /></>} secondary={back} className="flex flex-1 flex-col gap-5">
              <ScheduleFields account={account} business={business} />
              <div className="flex-1" />
            </ActionForm>
          )}

          {step.id === "source" && (
            <ActionForm action={saveSetupStep.bind(null, id, "source")} submitLabel={<>Continue <ArrowRight size={16} aria-hidden="true" /></>} secondary={back} className="flex flex-1 flex-col gap-5">
              <fieldset>
                <legend className="sr-only">How did you hear about us?</legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {HEARD_FROM.map((option) => (
                    <label key={option} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-canvas px-4 ring-1 ring-line has-[:checked]:bg-teal-soft/50 has-[:checked]:ring-teal">
                      <span className="font-medium">{option}</span>
                      <input type="radio" name="heard_from" value={option} required defaultChecked={account.heard_from === option} className="h-4 w-4 accent-[var(--teal)]" />
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex-1" />
            </ActionForm>
          )}

          {step.id === "launch" && (
            <div className="flex flex-1 flex-col gap-4">
              <p className="text-muted">Here&rsquo;s what the agent will do. Fix anything marked before launching.</p>
              <ul className="divide-y divide-line rounded-[20px] px-4 ring-1 ring-line">
                <Check2 ok={business.status === "ready" || business.status === "paused"} fix={<Link className="btn-secondary !min-h-9" href={setupHref(id, "company")}>Review</Link>}>
                  <span className="font-medium">{businessLabel(business)}</span> <span className="text-muted">confirmed</span>
                </Check2>
                <Check2 ok={liveSegments.length > 0} fix={<Link className="btn-secondary !min-h-9" href={setupHref(id, "buyers")}>Choose</Link>}>
                  {liveSegments.length} buyer {liveSegments.length === 1 ? "type" : "types"} to reach
                  <span className="block text-sm text-muted">{liveSegments.map((s) => s.name).join(", ")}</span>
                </Check2>
                <Check2 ok={Boolean(account.sender_name && account.company_name)} fix={<Link className="btn-secondary !min-h-9" href={setupHref(id, "sender")}>Add</Link>}>
                  Signed by {account.sender_name ?? "…"}{account.company_name ? `, ${account.company_name}` : ""}
                </Check2>
                <Check2 ok={domainVerified && Boolean(account.postal_address)} fix={<Link className="btn-secondary !min-h-9" href={setupHref(id, "mailbox")}>Fix</Link>}>
                  Sent from <span className="font-mono text-sm">{account.sender_email ?? "no address yet"}</span>
                  {!domainVerified && <span className="block text-sm text-muted">The sending address needs a verified domain.</span>}
                </Check2>
                <Check2 ok>
                  Up to {business.max_emails_per_day} emails a day, budget {formatUsd(business.daily_budget_cents)} a day
                  <span className="block text-sm text-muted">Weekdays 8:00–18:00 ({account.timezone}){trial.active ? `; ${TRIAL_MAX_EMAILS_PER_DAY} a day max during the free trial` : ""}</span>
                </Check2>
              </ul>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                {back}
                <div className="flex-1"><LaunchButtons id={id} /></div>
              </div>
            </div>
          )}
        </div>
      </article>
      {next && step.id !== "company" && (
        <p className="mt-3 text-center text-sm text-muted">Next: {next.title}</p>
      )}
    </div>
  );
}
