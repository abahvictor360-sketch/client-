import Link from "next/link";

/** Wordmark: a loop with a teal lead inside it. */
export function Logo({ href = "/" }: { href?: string }) {
  const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Leadloop";
  return (
    <Link href={href} translate="no" className="inline-flex min-h-11 items-center gap-1.5 text-[17px] font-semibold tracking-tight text-ink">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="1.5" y="1.5" width="19" height="19" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="14.5" cy="7.5" r="3" fill="var(--teal)" />
      </svg>
      {name.toLowerCase()}
    </Link>
  );
}
