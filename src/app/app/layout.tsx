import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { formatUsd, trialStatus } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: account } = await supabase
    .from("accounts")
    .select("credits_cents, trial_ends_at, is_admin, suspended")
    .eq("user_id", user.id)
    .single();
  const credits = account?.credits_cents ?? 0;
  const trial = trialStatus(account?.trial_ends_at);

  return (
    <div className="min-h-dvh p-3">
      <div className="frame">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="relative z-20 flex justify-center px-3 pt-4 sm:pt-6">
        <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 rounded-2xl bg-surface py-0.5 pl-4 pr-1.5 shadow-[var(--shadow-float)] ring-1 ring-line">
          <Logo href="/app" />
          <nav aria-label="App" className="flex flex-wrap items-center gap-1 text-sm">
            <NavLink href="/app" exact>Campaigns</NavLink>
            <NavLink href="/app/settings">Settings</NavLink>
            {account?.is_admin && <NavLink href="/admin">Admin</NavLink>}
            <NavLink href="/app/billing">
              {trial.active ? (
                <span>Trial: {trial.daysLeft} {trial.daysLeft === 1 ? "day" : "days"} left</span>
              ) : (
                <>
                  <span className="tabular-nums">{formatUsd(credits)}</span>
                  <span className="sr-only">credits left</span>
                </>
              )}
            </NavLink>
            <form action={signOut}>
              <button className="btn-quiet">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      {account?.suspended && (
        <p role="alert" className="mx-auto mt-3 w-fit max-w-[calc(100%-1.5rem)] rounded-full bg-surface-2 px-4 py-2 text-center text-sm text-danger">
          Your account is suspended, so the agent isn&apos;t sending. Contact support if you think this is a mistake.
        </p>
      )}
      {!account?.suspended && !trial.active && credits <= 0 && (
        <p role="status" className="mx-auto mt-3 w-fit max-w-[calc(100%-1.5rem)] rounded-full bg-dawn-soft px-4 py-2 text-center text-sm text-dawn-ink">
          Your free trial has ended, so the agent has stopped sending.{" "}
          <a href="/app/billing" className="font-semibold underline">Add credits</a>
        </p>
      )}
      <main id="main" className="mx-auto max-w-5xl px-5 py-8 sm:py-12">{children}</main>
      </div>
    </div>
  );
}
