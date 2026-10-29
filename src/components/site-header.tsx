import Link from "next/link";
import { Logo } from "@/components/logo";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
];

/** The floating pill navigation used on public pages. */
export function SiteHeader() {
  return (
    <header className="relative z-10 flex justify-center px-3 pt-4 sm:pt-6">
      <nav
        aria-label="Main"
        className="flex w-full max-w-3xl items-center justify-between gap-2 rounded-2xl bg-surface py-1 pl-4 pr-1.5 shadow-[var(--shadow-float)] ring-1 ring-line"
      >
        <Logo />
        <ul className="hidden items-center gap-1 text-sm md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="btn-quiet !min-h-9 !text-ink/80 hover:!text-ink">{l.label}</a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <Link href="/login" className="btn-quiet !min-h-9">Sign in</Link>
          <Link href="/signup" className="btn-primary !min-h-9 !px-4">Start free</Link>
        </div>
      </nav>
    </header>
  );
}
