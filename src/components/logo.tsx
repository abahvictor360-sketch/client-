import Link from "next/link";

/** Wordmark: a loop with the dawn sun rising through it. */
export function Logo({ href = "/", tone = "ink" }: { href?: string; tone?: "ink" | "night" }) {
  const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Leadloop";
  return (
    <Link
      href={href}
      translate="no"
      className={`inline-flex min-h-11 items-center gap-2 font-display text-xl font-semibold tracking-tight ${tone === "night" ? "text-night-ink" : "text-ink"}`}
    >
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="13" cy="13" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="13" cy="16" r="4" fill="var(--dawn)" />
        <path d="M5 16h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {name.toLowerCase()}
    </Link>
  );
}
