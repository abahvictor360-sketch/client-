import { ChevronRight, Inbox, PauseCircle, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Logo } from "@/components/logo";
import { HeroStart } from "@/components/hero-start";
import { SiteHeader } from "@/components/site-header";
import { WebsiteForm } from "@/components/website-form";
import { formatUsd, PRICE_PER_EMAIL_CENTS, SIGNUP_CREDITS_CENTS } from "@/lib/pricing";
import { PricingEstimator } from "./pricing-estimator";

function OfferCard() {
  return (
    <div className="glass flex h-full flex-col justify-between overflow-hidden p-5 sm:-rotate-3">
      <div className="-ml-8 mt-6 flex items-center gap-2 rounded-2xl bg-surface p-1.5 pl-4 shadow-[var(--shadow-float)] ring-1 ring-line">
        <span className="flex-1 truncate text-sm text-muted" translate="no">larksilk.com</span>
        <span className="rounded-xl bg-gradient-to-b from-teal to-teal-strong px-4 py-2 text-sm font-semibold text-white dark:text-[#0b1f1b]">Analyze site</span>
      </div>
      <div className="mt-10">
        <p className="eyebrow">We learn your offer</p>
        <p className="mt-1.5 text-[15px] font-semibold leading-snug">
          Paste a link. Get buyer segments. <span className="font-normal text-muted">No briefs to write.</span>
        </p>
      </div>
    </div>
  );
}

function RepliesCard() {
  return (
    <div className="glass flex h-full flex-col justify-between overflow-hidden p-5">
      <div className="relative mt-2 h-36">
        <div className="absolute left-0 top-0 w-[86%] rounded-2xl bg-surface p-3 shadow-[var(--shadow-float)] ring-1 ring-line">
          <div className="flex items-start gap-2.5">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold">DO</span>
            <div className="min-w-0 text-xs">
              <p className="text-muted">Dana Okafor</p>
              <p className="font-medium">Interesting. Can you do Tuesday 2pm?</p>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-[4.6rem] z-10 w-[78%] rounded-2xl bg-surface p-3 text-xs shadow-[var(--shadow-float)] ring-1 ring-line">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Agent</span>
            <span className="pill bg-teal-soft text-teal-ink">Booked</span>
          </div>
          <p className="mt-1 font-medium">Tuesday 2pm works. Invite sent.</p>
        </div>
      </div>
      <div className="mt-6">
        <p className="eyebrow">We handle replies</p>
        <p className="mt-1.5 text-[15px] font-semibold leading-snug">
          <span className="font-normal text-muted">Answers questions and</span> books the call for you
        </p>
      </div>
    </div>
  );
}

function ResultsCard() {
  const bars = [38, 52, 46, 92, 44];
  return (
    <div className="glass flex h-full flex-col justify-between overflow-hidden p-5 sm:rotate-3">
      <div className="relative mt-2 flex h-32 items-end justify-center gap-3">
        <span aria-hidden="true" className="absolute inset-x-0 top-[42%] border-t-2 border-dashed border-teal/50" />
        {bars.map((h, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{ height: `${h}%` }}
            className={`w-7 rounded-t-lg ${i === 3 ? "bg-gradient-to-b from-teal/90 to-teal/10 shadow-[0_0_24px_rgba(42,140,123,0.35)]" : "bg-gradient-to-b from-ink/15 to-ink/0"}`}
          />
        ))}
      </div>
      <div className="mt-6">
        <p className="eyebrow">We show what works</p>
        <p className="mt-1.5 text-[15px] font-semibold leading-snug">
          <span className="font-normal text-muted">So you know</span> what&apos;s winning{" "}
          <span className="font-normal text-muted">and where</span> budget goes
        </p>
      </div>
    </div>
  );
}

const steps = [
  { title: "Learns what you sell", body: "Reads your site and the competitors buyers compare you with." },
  { title: "Works out who buys it", body: "Proposes buyer types with a fit score. Pause any you don't want." },
  { title: "Finds the decision makers", body: "Pulls owners and buyers from a B2B database, verified emails only." },
  { title: "Writes each a personal email", body: "Researches every company first. Under 90 words, no templates." },
  { title: "Answers replies, books calls", body: "Offers times inside your hours and sends the calendar invite." },
  { title: "Moves budget to winners", body: "Tracks cost per warm lead and scales the buyer types that convert." },
];

const controls = [
  { icon: Wallet, title: "A daily budget you set", body: "It stops for the day at your cap or when credits run out." },
  { icon: PauseCircle, title: "Pause anything", body: "Stop the whole agent or one buyer type in a click." },
  { icon: Inbox, title: "Every conversation visible", body: "Read each email it sent and every reply it handled." },
  { icon: ShieldCheck, title: "Compliance built in", body: "Postal address, one-click unsubscribe and a do-not-contact list." },
];

const stack = ["Claude", "Apollo.io", "Resend", "Stripe", "Supabase"];

export default function Home() {
  return (
    <div className="min-h-dvh p-3">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="frame">
        <SiteHeader />

        <main id="main">
          <section className="relative px-5 pb-16 pt-14 text-center sm:pt-20">
            <a
              href="#how"
              className="rise inline-flex min-h-9 items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-sm shadow-[var(--shadow-float)] ring-1 ring-line"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-canvas">
                New <Sparkles size={12} aria-hidden="true" />
              </span>
              Replies now book meetings
              <ChevronRight size={16} aria-hidden="true" className="text-muted" />
            </a>

            <h1 className="rise mx-auto mt-7 max-w-4xl text-[2.6rem] tracking-[-0.045em] [animation-delay:80ms] sm:text-7xl">
              Outbound that works like a{" "}
              <span className="relative inline-block whitespace-nowrap rounded-2xl bg-gradient-to-b from-teal-soft to-teal-soft/40 px-3 pb-1 text-teal-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_30px_-12px_rgba(42,140,123,0.5)] ring-1 ring-teal/20">
                Sales Rep
              </span>
            </h1>
            <p className="rise mx-auto mt-6 max-w-xl text-lg text-muted [animation-delay:160ms]">
              Paste your website. It finds your buyers, writes each one a personal email, answers the replies and books
              meetings on your calendar.
            </p>
            <div className="rise [animation-delay:240ms]">
              <HeroStart />
              <p className="hint">Includes {formatUsd(SIGNUP_CREDITS_CENTS)} of free credits. No card needed.</p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-5 text-left sm:grid-cols-3 sm:gap-6">
              <OfferCard />
              <div className="sm:-mt-3"><RepliesCard /></div>
              <ResultsCard />
            </div>
          </section>

          <section aria-labelledby="setup-title" className="border-t border-line px-5 py-16 text-center">
            <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface shadow-[var(--shadow-float)] ring-1 ring-line">
              <Sparkles size={22} className="text-teal" />
            </span>
            <h2 id="setup-title" className="mt-4 text-xl tracking-tight">Live in one afternoon</h2>
            <p className="mx-auto mt-2 max-w-md text-muted">
              Verify a sending domain, paste your website, review the buyer types and press Start. No SDRs, no sequences
              to write.
            </p>
            <p className="mt-10 text-sm text-muted">Built on</p>
            <ul className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-2 sm:gap-4">
              {stack.map((name, i) => (
                <li
                  key={name}
                  translate="no"
                  className={`rounded-2xl px-5 py-3 text-lg font-semibold tracking-tight ${
                    i === 0 ? "bg-surface text-ink shadow-[var(--shadow-float)] ring-1 ring-line [box-shadow:var(--shadow-float),inset_0_-3px_0_var(--ink)]" : "text-muted"
                  }`}
                >
                  {name}
                </li>
              ))}
            </ul>
          </section>

          <section id="how" aria-labelledby="how-title" className="border-t border-line px-5 py-20">
            <div className="mx-auto max-w-5xl">
              <p className="eyebrow text-center">How it works</p>
              <h2 id="how-title" className="mx-auto mt-3 max-w-2xl text-center text-4xl sm:text-5xl">
                From a URL to booked calls, without you in the loop
              </h2>
              <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {steps.map((step, i) => (
                  <li key={step.title} className="panel p-6">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-soft text-sm font-semibold text-teal-ink tabular-nums">
                      {i + 1}
                    </span>
                    <h3 className="mt-4 text-lg tracking-tight">{step.title}</h3>
                    <p className="mt-1.5 text-muted">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="features" aria-labelledby="control-title" className="border-t border-line px-5 py-20">
            <div className="mx-auto max-w-5xl">
              <p className="eyebrow text-center">You stay in charge</p>
              <h2 id="control-title" className="mx-auto mt-3 max-w-2xl text-center text-4xl sm:text-5xl">
                It runs on its own, inside limits you set
              </h2>
              <ul className="mt-12 grid gap-4 sm:grid-cols-2">
                {controls.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="panel flex gap-4 p-6">
                    <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal-ink">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h3 className="text-lg tracking-tight">{title}</h3>
                      <p className="mt-1 text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="pricing" aria-labelledby="pricing-title" className="border-t border-line px-5 py-20">
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="eyebrow">Pricing</p>
                <h2 id="pricing-title" className="mt-3 text-4xl sm:text-5xl">
                  {formatUsd(PRICE_PER_EMAIL_CENTS)} per email. Nothing else.
                </h2>
                <p className="mt-4 max-w-md text-lg text-muted">
                  Research, writing, follow-ups and AI replies are included. No subscription, no seats, and your first{" "}
                  {formatUsd(SIGNUP_CREDITS_CENTS)} is on us.
                </p>
              </div>
              <PricingEstimator pricePerEmailCents={PRICE_PER_EMAIL_CENTS} />
            </div>
          </section>

          <section aria-labelledby="cta-title" className="border-t border-line px-5 py-20 text-center">
            <h2 id="cta-title" className="mx-auto max-w-2xl text-4xl sm:text-5xl">Give it one night</h2>
            <p className="mx-auto mt-3 max-w-md text-muted">Review the buyer types it picks before you switch it on.</p>
            <div className="mx-auto mt-8 flex max-w-xl justify-center text-left">
              <WebsiteForm id="cta-website" />
            </div>
          </section>
        </main>

        <footer className="flex flex-col items-center gap-2 border-t border-line px-5 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-16">
          <Logo />
          <p>© {new Date().getFullYear()} Leadloop</p>
        </footer>
      </div>
    </div>
  );
}
