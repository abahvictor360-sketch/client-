import { redirect } from "next/navigation";
import { formatUsd, trialStatus } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import { GetStarted, type OnboardingStep } from "./get-started";
import { Sidebar, type SidebarBusiness } from "./sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const [{ data: account }, { data: businesses }, { data: segments }, { count: verifiedDomains }, { count: replies }] = await Promise.all([
    supabase
      .from("accounts")
      .select("credits_cents, trial_ends_at, is_admin, suspended, sender_name, company_name, sender_email, postal_address, onboarding_dismissed_at")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("businesses")
      .select("id, name, website, description, status, confirmed_at, facts")
      .order("created_at", { ascending: false }),
    supabase.from("segments").select("id, business_id, name, status, fit_score, sent").order("fit_score", { ascending: false }),
    supabase.from("sending_domains").select("id", { count: "exact", head: true }).eq("status", "verified"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("direction", "inbound"),
  ]);
  const credits = account?.credits_cents ?? 0;
  const trial = trialStatus(account?.trial_ends_at);

  const list: SidebarBusiness[] = (businesses ?? []).map((b) => ({
    id: b.id,
    label: b.name ?? (b.website ? new URL(b.website).hostname.replace(/^www\./, "") : "Untitled business"),
    host: b.website ? new URL(b.website).hostname.replace(/^www\./, "") : null,
    status: b.status,
    needsSetup: b.status === "ready" && !b.confirmed_at,
    segments: (segments ?? [])
      .filter((s) => s.business_id === b.id)
      .map((s) => ({ id: s.id, name: s.name, status: s.status })),
  }));

  // "Get started" checklist: each step is read from the account's real state.
  const latest = businesses?.[0];
  const base = latest ? `/app/b/${latest.id}` : null;
  const onboarding: OnboardingStep[] = [
    { id: "business", label: "Add your business", hint: "Paste your website or describe what you sell.", href: "/app?new=1", done: Boolean(latest) },
    { id: "confirm", label: "Confirm your company and buyers", hint: "Check what the agent learned and who it will reach.", href: base ? `${base}/setup?step=company` : "/app?new=1", done: (businesses ?? []).some((b) => b.confirmed_at) },
    { id: "domain", label: "Connect a sending domain", hint: "Emails go out from your own domain.", href: "/app/settings", done: (verifiedDomains ?? 0) > 0 },
    { id: "sender", label: "Add your sender details", hint: "Name, company, sending address and postal address.", href: "/app/settings", done: Boolean(account?.sender_name && account.company_name && account.sender_email && account.postal_address) },
    { id: "facts", label: "Tell the agent your pricing", hint: "So it answers prospects' questions accurately.", href: base ? `${base}/profile` : "/app?new=1", done: (businesses ?? []).some((b) => Object.values((b.facts ?? {}) as Record<string, string>).some(Boolean)) },
    { id: "launch", label: "Launch your first campaign", hint: "The agent starts finding and emailing buyers.", href: base ? `${base}/setup?step=launch` : "/app?new=1", done: (businesses ?? []).some((b) => b.status === "running") || (segments ?? []).some((s) => s.sent > 0) },
    { id: "reply", label: "Get your first reply", hint: "Usually within a few days of launching.", href: base ? `${base}/inbox` : "/app?new=1", done: (replies ?? 0) > 0 },
  ];
  const showOnboarding = !account?.onboarding_dismissed_at && onboarding.some((s) => !s.done);

  return (
    <div className="min-h-dvh bg-canvas lg:flex lg:bg-transparent">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Sidebar
        businesses={list}
        email={user.email ?? ""}
        isAdmin={Boolean(account?.is_admin)}
        plan={trial.active ? `Free trial · ${trial.daysLeft} ${trial.daysLeft === 1 ? "day" : "days"} left` : `Balance ${formatUsd(credits)}`}
      />
      <div className="min-w-0 flex-1">
        <div className="min-h-full bg-canvas lg:min-h-dvh lg:border-l lg:border-line">
          {account?.suspended && (
            <p role="alert" className="border-b border-line px-5 py-2.5 text-center text-sm text-danger">
              Your account is suspended, so the agent isn&apos;t sending. Contact support if you think this is a mistake.
            </p>
          )}
          {!account?.suspended && !trial.active && credits <= 0 && (
            <p role="status" className="border-b border-line bg-dawn-soft px-5 py-2.5 text-center text-sm text-dawn-ink">
              Your free trial has ended, so the agent has stopped sending.{" "}
              <a href="/app/billing" className="font-semibold underline">Top up</a>
            </p>
          )}
          {showOnboarding && <GetStarted steps={onboarding} />}
          <main id="main" className="mx-auto max-w-screen-2xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-10 lg:px-10 lg:pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
