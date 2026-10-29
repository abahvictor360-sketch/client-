import Link from "next/link";
import { Logo } from "@/components/logo";
import { formatUsd, PRICE_PER_EMAIL_CENTS, SIGNUP_CREDITS_CENTS } from "@/lib/pricing";

const steps = [
  {
    title: "Learns what you sell",
    body: "Reads your website and researches your competitors to understand your offer and where you win.",
    demo: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">larksilk.com</p>
        <p className="text-muted">Wholesale silk flowers and greenery for hotels, restaurants and florists.</p>
        <div className="border-t border-line pt-2 text-muted">Studying competitors…</div>
        <p>✓ afloral.com</p>
        <p className="text-muted">✓ nearlynatural.com</p>
      </div>
    ),
  },
  {
    title: "Figures out who buys it",
    body: "Proposes buyer segments with a fit score and the exact filters to find them.",
    demo: (
      <table className="w-full text-sm">
        <tbody>
          {[
            ["Event designers", "92%"],
            ["Wedding floral studios", "88%"],
            ["Wedding planners", "85%"],
            ["Country clubs", "79%"],
          ].map(([name, fit]) => (
            <tr key={name} className="border-b border-line last:border-0">
              <td className="py-2">{name}</td>
              <td className="py-2 text-right text-muted">{fit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    title: "Finds those exact people",
    body: "Pulls decision makers with verified work emails from a B2B database of hundreds of millions of contacts.",
    demo: (
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {[
          ["Owner", "Sweet Pea Events"],
          ["Lead Designer", "Tupelo Honey"],
        ].map(([role, company]) => (
          <div key={company} className="rounded-xl bg-surface-2 p-3">
            <p className="font-medium">{role}</p>
            <p className="text-muted">{company}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Writes each a personal email",
    body: "Researches every prospect's business and opens with something specific and true about them.",
    demo: (
      <div className="text-sm">
        <p>
          <span className="text-muted">Subject</span> Larksilk x Tupelo Honey
        </p>
        <p className="mt-2 text-muted">
          Saw Tupelo Honey designs full-scale event installs. Fresh florals get expensive fast and wilt under venue
          lights…
        </p>
      </div>
    ),
  },
  {
    title: "Handles replies and books meetings",
    body: "Answers questions, offers times from your calendar hours and sends the invite.",
    demo: (
      <div className="space-y-2 text-sm">
        <p className="w-fit rounded-xl bg-surface-2 px-3 py-2">Interesting, can you do Tuesday 2pm?</p>
        <p className="ml-auto w-fit rounded-xl bg-accent-soft px-3 py-2">Tuesday 2pm works, sending the invite now.</p>
      </div>
    ),
  },
  {
    title: "Learns what works and doubles down",
    body: "Tracks replies and cost per lead by segment, scales the winners and pauses the rest.",
    demo: (
      <table className="w-full text-sm">
        <tbody>
          {[
            ["Event designers", "Scaling", "$1.69"],
            ["Wedding planners", "Working", "$2.08"],
            ["Houses of worship", "Paused", "—"],
          ].map(([name, status, cost]) => (
            <tr key={name} className="border-b border-line last:border-0">
              <td className="py-2">{name}</td>
              <td className="py-2 text-muted">{status}</td>
              <td className="py-2 text-right">{cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <nav className="flex items-center gap-5 text-sm">
          <a href="#pricing" className="hidden sm:inline">
            Pricing
          </a>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pb-24 pt-16 text-center sm:pt-24">
          <p className="pill mx-auto border border-line bg-surface">
            {formatUsd(SIGNUP_CREDITS_CENTS)} in free credits
          </p>
          <h1 className="mt-6 text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
            An AI agent that books <span className="text-accent">sales meetings</span> while you sleep
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            Paste your website. It finds your buyers, emails each one personally, handles the replies and puts
            meetings on your calendar.
          </p>
          <form action="/signup" className="mx-auto mt-10 flex max-w-xl gap-2 rounded-2xl border-2 border-fg bg-surface p-2">
            <input
              name="website"
              required
              placeholder="Paste your website, e.g. acme.com"
              className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
            />
            <button className="btn-primary" aria-label="Start">
              Start →
            </button>
          </form>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <h2 className="text-center text-3xl font-medium tracking-tight sm:text-4xl">We run the entire pipeline</h2>
          <div className="mt-12 grid gap-4">
            {steps.map((step, i) => (
              <div key={step.title} className="card grid gap-6 p-6 sm:grid-cols-2 sm:p-10">
                <div>
                  <p className="text-sm text-muted">Step {i + 1}</p>
                  <h3 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">{step.title}</h3>
                  <p className="mt-3 text-muted">{step.body}</p>
                </div>
                <div className="rounded-xl border border-line p-4">{step.demo}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-3xl px-4 pb-24 text-center">
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Pay only for what the agent sends</h2>
          <div className="card mt-10 p-8">
            <p className="text-5xl font-medium">{formatUsd(PRICE_PER_EMAIL_CENTS)}</p>
            <p className="mt-1 text-muted">per email, including research, writing, follow-ups and AI replies</p>
            <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm">
              <li>✓ No subscription — set a daily budget and stop anytime</li>
              <li>✓ {formatUsd(SIGNUP_CREDITS_CENTS)} in free credits to start</li>
              <li>✓ Unsubscribe handling and compliance footer built in</li>
            </ul>
            <Link href="/signup" className="btn-primary mt-8">
              Get started free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between">
          <Logo />
          <p>© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
