import { redirect } from "next/navigation";
import { formatUsd, trialStatus } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";
import { Sidebar, type SidebarBusiness } from "./sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const [{ data: account }, { data: businesses }, { data: segments }] = await Promise.all([
    supabase.from("accounts").select("credits_cents, trial_ends_at, is_admin, suspended").eq("user_id", user.id).single(),
    supabase
      .from("businesses")
      .select("id, name, website, description, status, confirmed_at")
      .order("created_at", { ascending: false }),
    supabase.from("segments").select("id, business_id, name, status, fit_score").order("fit_score", { ascending: false }),
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
      <div className="min-w-0 flex-1 lg:p-3 lg:pl-0">
        <div className="min-h-full bg-canvas lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-[28px] lg:ring-1 lg:ring-line">
          {account?.suspended && (
            <p role="alert" className="border-b border-line px-5 py-2.5 text-center text-sm text-danger">
              Your account is suspended, so the agent isn&apos;t sending. Contact support if you think this is a mistake.
            </p>
          )}
          {!account?.suspended && !trial.active && credits <= 0 && (
            <p role="status" className="border-b border-line bg-dawn-soft px-5 py-2.5 text-center text-sm text-dawn-ink lg:rounded-t-[28px]">
              Your free trial has ended, so the agent has stopped sending.{" "}
              <a href="/app/billing" className="font-semibold underline">Top up</a>
            </p>
          )}
          <main id="main" className="mx-auto max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-10 lg:pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
