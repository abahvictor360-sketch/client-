import { Inbox, PauseCircle, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { WebsiteForm } from "@/components/website-form";
import { formatUsd, PRICE_PER_EMAIL_CENTS, SIGNUP_CREDITS_CENTS } from "@/lib/pricing";
import { OvernightLog } from "./overnight-log";
import { PricingEstimator } from "./pricing-estimator";

const steps: { title: string; body: string; artifact: React.ReactNode }[] = [
  {
    title: "It learns what you sell",
    body: "Reads your site, then looks up the competitors buyers compare you with, so every email leads with where you actually win.",
    artifact: (
      <div className="text-sm">
        <p className="font-medium">Larksilk</p>
        <p className="text-muted">Wholesale silk flowers for hotels, restaurants and florists. 45 years in business.</p>
        <p className="mt-3 text-muted">Compared against afloral.com and nearlynatural.com</p>
      </div>
    ),
  },
  {
    title: "It works out who buys it",
    body: "Proposes buyer types with a fit score and the filters to find them. You can pause any you don't want.",
    artifact: (
      <table className="data-table">
        <tbody>
          {[
            ["Event designers", "92%"],
            ["Wedding floral studios", "88%"],
            ["Wedding planners", "85%"],
          ].map(([name, fit]) => (
            <tr key={name}>
              <td className="!px-0">{name}</td>
              <td className="!px-0 text-right text-muted">{fit} fit</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    title: "It finds the decision makers",
    body: "Pulls owners and buyers at those companies from a B2B database and keeps only verified work emails.",
    artifact: (
      <ul className="space-y-2 text-sm">
        {[
          ["Rachel Whitfield", "Owner, Sweet Pea Events"],
          ["Dana Okafor", "Lead designer, Tupelo Honey"],
        ].map(([name, role]) => (
          <li key={name} className="flex items-center gap-3">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold">
              {name.split(" ").map((p) => p[0]).join("")}
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{name}</span>
              <span className="block truncate text-muted">{role}</span>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: "It writes each one a personal email",
    body: "Researches every company first and opens with something specific and true. No templates, no links, under 90 words.",
    artifact: (
      <div className="text-sm">
        <p className="font-medium">Larksilk x Tupelo Honey Flower</p>
        <p className="mt-2 text-muted">
          Saw you design full-scale event installs. At that pace fresh florals get expensive fast and wilt under venue
          lights…
        </p>
      </div>
    ),
  },
  {
    title: "It answers replies and books the call",
    body: "Handles questions, offers times inside your working hours and sends the calendar invite. Unsubscribes are honored instantly.",
    artifact: (
      <div className="space-y-2 text-sm">
        <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-surface-2 px-3 py-2">Can you do Tuesday 2pm?</p>
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-dawn-soft px-3 py-2">
          Tuesday 2pm works. I&apos;ve sent the invite.
        </p>
      </div>
    ),
  },
  {
    title: "It shifts budget to what works",
    body: "Tracks cost per warm lead for each buyer type, sends more to the winners and pauses the rest.",
    artifact: (
      <table className="data-table">
        <tbody>
          {[
            ["Event designers", "Scaling", "$1.69"],
            ["Wedding planners", "Working", "$2.08"],
            ["Houses of worship", "Paused", "–"],
          ].map(([name, status, cost]) => (
            <tr key={name}>
              <td className="!px-0">{name}</td>
              <td className="text-muted">{status}</td>
              <td className="!px-0 text-right">{cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
];

const controls = [
  { icon: Wallet, title: "A daily budget you set", body: "It stops for the day when it hits your cap or your credits run out." },
  { icon: PauseCircle, title: "Pause anything", body: "Stop the whole agent or one buyer type with a single click." },
  { icon: Inbox, title: "Every conversation visible", body: "Read each email it sent and every reply it handled, in one inbox." },
  { icon: ShieldCheck, title: "Compliance built in", body: "Your postal address, one-click unsubscribe and a do-not-contact list on every send." },
];

export default function Home() {
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <a href="#how" className="btn-quiet hidden sm:inline-flex">How it works</a>
          <a href="#pricing" className="btn-quiet hidden sm:inline-flex">Pricing</a>
          <Link href="/login" className="btn-quiet">Sign in</Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <h1 className="text-[2.75rem] sm:text-6xl">Wake up to booked sales meetings</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Paste your website. Overnight, the agent works out who buys from you, emails each of them personally,
              answers the replies and puts the calls on your calendar.
            </p>
            <div className="mt-8">
              <WebsiteForm id="hero-website" />
              <p className="hint">Includes {formatUsd(SIGNUP_CREDITS_CENTS)} of free credits. No card needed.</p>
            </div>
          </div>
          <OvernightLog />
        </section>

        <section id="how" aria-labelledby="how-title" className="border-t border-line bg-surface py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="how-title" className="max-w-2xl text-4xl sm:text-5xl">What happens after you paste your website</h2>
            <ol className="mt-14 space-y-12">
              {steps.map((step, i) => (
                <li key={step.title} className="grid gap-6 md:grid-cols-[3rem_1fr_1fr] md:gap-10">
                  <span
                    aria-hidden="true"
                    className="grid h-12 w-12 place-items-center rounded-full border border-line font-display text-lg font-semibold tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-2xl sm:text-3xl">{step.title}</h3>
                    <p className="mt-3 max-w-md text-muted">{step.body}</p>
                  </div>
                  <div className="rounded-[var(--radius-panel)] bg-paper p-5">{step.artifact}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="control-title" className="mx-auto max-w-6xl px-4 py-20">
          <h2 id="control-title" className="max-w-2xl text-4xl sm:text-5xl">It runs on its own. You stay in charge.</h2>
          <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {controls.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <Icon size={24} aria-hidden="true" className="mt-0.5 shrink-0 text-ink" />
                <div>
                  <h3 className="font-sans text-lg font-semibold tracking-normal">{title}</h3>
                  <p className="mt-1 text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="pricing" aria-labelledby="pricing-title" className="border-t border-line bg-surface py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 id="pricing-title" className="text-4xl sm:text-5xl">
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

        <section aria-labelledby="cta-title" className="bg-night py-20 text-night-ink">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="cta-title" className="text-4xl sm:text-5xl">Give it one night</h2>
              <p className="mt-3 max-w-md text-night-muted">Review the buyer types it picks before you switch it on.</p>
            </div>
            <div className="w-full max-w-xl [&_.label]:text-night-ink [&_.btn-primary]:bg-dawn [&_.btn-primary]:text-[#141a2e]">
              <WebsiteForm id="footer-website" buttonLabel="Start free" />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <p>© {new Date().getFullYear()} Leadloop</p>
      </footer>
    </div>
  );
}
