"use client";

import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  ChevronsUpDown,
  CircleGauge,
  Crosshair,
  Globe,
  Inbox,
  LogOut,
  Menu,
  Plus,
  Send,
  Settings,
  Shield,
  ShieldBan,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { InstallApp } from "@/components/pwa";

export type SidebarBusiness = {
  id: string;
  label: string;
  host: string | null;
  status: string;
  needsSetup: boolean;
  segments: { id: string; name: string; status: string }[];
};

const LIVE = ["testing", "working", "scaling"];

function Item({ href, icon: Icon, children, exact = false }: {
  href: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const path = href.split("?")[0];
  const active = exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 text-[15px] transition-colors ${
        active ? "bg-surface font-medium text-ink shadow-[var(--shadow-float)] ring-1 ring-line" : "text-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      <Icon size={17} aria-hidden />
      <span className="truncate">{children}</span>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="eyebrow mb-1.5 px-3">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

/** Closes a <details> menu when the user clicks elsewhere or navigates. */
function useDetailsMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return ref;
}

function BusinessSwitcher({ businesses, current }: { businesses: SidebarBusiness[]; current?: SidebarBusiness }) {
  const ref = useDetailsMenu();
  return (
    <details ref={ref} className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-[12px] px-3 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-soft text-sm font-semibold text-teal-ink" aria-hidden="true">
          {(current?.label ?? "+").charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{current?.label ?? "New business"}</span>
        <ChevronsUpDown size={16} className="text-muted" aria-hidden="true" />
        <span className="sr-only">Switch business</span>
      </summary>
      <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-[14px] bg-surface p-1 shadow-[var(--shadow-float)] ring-1 ring-line">
        <ul className="max-h-72 overflow-y-auto">
          {businesses.map((b) => (
            <li key={b.id}>
              <Link
                href={`/app/b/${b.id}`}
                aria-current={b.id === current?.id ? "true" : undefined}
                className={`flex min-h-10 items-center justify-between gap-2 rounded-[10px] px-3 text-sm hover:bg-surface-2 ${b.id === current?.id ? "font-semibold" : ""}`}
              >
                <span className="truncate">{b.label}</span>
                {b.host && b.host !== b.label && <span className="truncate text-xs text-muted" translate="no">{b.host}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/app?new=1" className="mt-1 flex min-h-10 items-center gap-2 rounded-[10px] border-t border-line px-3 text-sm font-medium text-teal-ink hover:bg-surface-2">
          <Plus size={16} aria-hidden="true" />
          Add a business
        </Link>
      </div>
    </details>
  );
}

function AccountMenu({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const ref = useDetailsMenu();
  return (
    <details ref={ref} className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-[12px] px-3 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold ring-1 ring-line" aria-hidden="true">
          {email.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{email}</span>
        <ChevronsUpDown size={16} className="text-muted" aria-hidden="true" />
        <span className="sr-only">Account menu</span>
      </summary>
      <div className="absolute inset-x-0 bottom-full z-30 mb-1 rounded-[14px] bg-surface p-1 shadow-[var(--shadow-float)] ring-1 ring-line">
        <Link href="/app/settings" className="flex min-h-10 items-center gap-2 rounded-[10px] px-3 text-sm hover:bg-surface-2">
          <Settings size={16} aria-hidden="true" /> Account settings
        </Link>
        <Link href="/app/billing" className="flex min-h-10 items-center gap-2 rounded-[10px] px-3 text-sm hover:bg-surface-2">
          <Wallet size={16} aria-hidden="true" /> Billing
        </Link>
        {isAdmin && (
          <Link href="/admin" className="flex min-h-10 items-center gap-2 rounded-[10px] px-3 text-sm hover:bg-surface-2">
            <Shield size={16} aria-hidden="true" /> Admin
          </Link>
        )}
        <form action={signOut}>
          <button className="flex min-h-10 w-full items-center gap-2 rounded-[10px] px-3 text-sm text-danger hover:bg-surface-2">
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </form>
      </div>
    </details>
  );
}

export function Sidebar({ businesses, email, isAdmin, plan }: {
  businesses: SidebarBusiness[];
  email: string;
  isAdmin: boolean;
  plan: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  // The business in the URL, or the most recent one on account-wide pages.
  const idInPath = pathname.match(/^\/app\/b\/([^/]+)/)?.[1];
  const current = businesses.find((b) => b.id === idInPath) ?? (pathname === "/app" ? undefined : businesses[0]);
  const base = current ? `/app/b/${current.id}` : null;
  const running = current?.status === "running";

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3">
        <span className="pill bg-surface-2 text-muted">{plan}</span>
        <Link href="/app/billing" className="btn-primary !min-h-8 !rounded-[10px] !px-3 !text-xs">Top up</Link>
      </div>

      <div className="mt-4">
        <BusinessSwitcher businesses={businesses} current={current} />
      </div>

      <nav aria-label="App" className="-mx-1 mt-3 flex-1 overflow-y-auto overscroll-contain px-1 pb-4">
        {base ? (
          <>
            <Item href={base} icon={CircleGauge} exact>Dashboard</Item>
            <Section title="Mailbox">
              <Item href={`${base}/inbox`} icon={Inbox}>Inbox</Item>
              <Item href={`${base}/sent`} icon={Send}>Sent</Item>
              <Item href={`${base}/meetings`} icon={CalendarDays}>Meetings</Item>
            </Section>
            <Section title="Setup">
              <Item href={`${base}/profile`} icon={BookOpen}>Business profile</Item>
              <Item href={`${base}/targeting`} icon={Crosshair}>Targeting</Item>
              <Item href={`${base}/people`} icon={Users}>People</Item>
              <Item href={`${base}/schedule`} icon={CalendarClock}>Sending schedule</Item>
              <Item href="/app/suppress" icon={ShieldBan}>Suppress list</Item>
              <Item href="/app/settings" icon={Globe}>Domains &amp; sender</Item>
            </Section>
            <Section title="Buyer types">
              {current!.segments.map((s) => {
                const href = `${base}/targeting/${s.id}`;
                const live = running && LIVE.includes(s.status);
                return (
                  <Link
                    key={s.id}
                    href={href}
                    aria-current={pathname === href ? "page" : undefined}
                    className={`flex min-h-9 items-center gap-2.5 rounded-[10px] px-3 text-sm transition-colors ${
                      pathname === href ? "bg-surface font-medium text-ink ring-1 ring-line" : "text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${live ? "bg-teal" : s.status === "exhausted" ? "ring-1 ring-muted" : "bg-muted/40"}`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{s.name}</span>
                    <span className="sr-only">({live ? "sending" : s.status === "exhausted" ? "no more people" : "not sending"})</span>
                  </Link>
                );
              })}
              <Link href={`${base}/targeting/new`} className="flex min-h-9 items-center gap-2.5 rounded-[10px] px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink">
                <Plus size={16} aria-hidden="true" /> New buyer type
              </Link>
              {current!.segments.length === 0 && (
                <p className="px-3 py-1 text-sm text-muted">
                  {current!.status === "analyzing" ? "Working them out…" : "None yet."}
                </p>
              )}
            </Section>
          </>
        ) : (
          <>
            <Item href="/app" icon={Plus} exact>New business</Item>
            <Section title="Account">
              <Item href="/app/suppress" icon={ShieldBan}>Suppress list</Item>
              <Item href="/app/settings" icon={Globe}>Domains &amp; sender</Item>
              <Item href="/app/billing" icon={Wallet}>Billing</Item>
            </Section>
          </>
        )}
      </nav>

      <InstallApp className="pb-1" />
      <div className="border-t border-line pt-2">
        <AccountMenu email={email} isAdmin={isAdmin} />
      </div>
    </div>
  );

  return (
    <>
      {/* Phones and tablets: a top bar that opens the same navigation as a drawer. */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-canvas/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <Logo href="/app" />
        {current && <span className="min-w-0 truncate text-sm font-medium text-muted">{current.label}</span>}
        <button className="btn-quiet" aria-expanded={open} aria-controls="app-sidebar" onClick={() => setOpen((v) => !v)}>
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      {/* Phones: thumb-reach tabs for the pages used most. */}
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-md">
          {(base
            ? [
                { href: base, label: "Home", icon: CircleGauge, exact: true },
                { href: `${base}/inbox`, label: "Inbox", icon: Inbox },
                { href: `${base}/sent`, label: "Sent", icon: Send },
                { href: `${base}/targeting`, label: "Targeting", icon: Crosshair },
              ]
            : [
                { href: "/app", label: "New", icon: Plus, exact: true },
                { href: "/app/settings", label: "Sender", icon: Globe },
                { href: "/app/billing", label: "Billing", icon: Wallet },
              ]
          ).map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-teal-ink" : "text-muted"}`}
                >
                  <Icon size={20} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              onClick={() => setOpen(true)}
              aria-controls="app-sidebar"
              aria-expanded={open}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted"
            >
              <Menu size={20} aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-paper p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-64 lg:shrink-0 lg:translate-x-0 ${
          open ? "translate-x-0 shadow-[var(--shadow-float)]" : "-translate-x-full"
        } motion-reduce:transition-none`}
      >
        <div className="mb-4 hidden px-3 lg:block">
          <Logo href="/app" />
        </div>
        <div className="h-[calc(100%-0.5rem)] lg:h-[calc(100%-4rem)]">{nav}</div>
      </aside>
    </>
  );
}
