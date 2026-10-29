import Link from "next/link";
import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: { default: "Admin", template: "%s · Admin" } };
export const dynamic = "force-dynamic";

const sections = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/domains", label: "Domains" },
  { href: "/admin/suppressions", label: "Do-not-contact" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="frame">
        <header className="relative z-20 flex justify-center px-3 pt-4 sm:pt-6">
          <div className="flex w-full max-w-screen-2xl flex-wrap items-center justify-between gap-x-4 rounded-2xl bg-surface py-0.5 pl-4 pr-1.5 shadow-[var(--shadow-float)] ring-1 ring-line">
            <div className="flex items-center gap-2">
              <Logo href="/admin" />
              <span className="pill bg-ink text-canvas">Admin</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="hidden px-2 text-muted sm:inline">{me.email}</span>
              <Link href="/app" className="btn-quiet">Back to app</Link>
            </div>
          </div>
        </header>
        <nav aria-label="Admin sections" className="mx-auto mt-4 max-w-screen-2xl overflow-x-auto px-5">
          <ul className="flex min-w-max gap-1">
            {sections.map((s) => (
              <li key={s.href}>
                <NavLink href={s.href} exact={s.exact}>{s.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main" className="mx-auto max-w-screen-2xl space-y-8 px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
