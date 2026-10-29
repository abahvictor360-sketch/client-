import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { formatUsd } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: account } = await supabase.from("accounts").select("credits_cents").eq("user_id", user.id).single();
  const credits = account?.credits_cents ?? 0;

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 py-1">
          <Logo href="/app" />
          <nav aria-label="App" className="flex flex-wrap items-center gap-1 text-sm">
            <NavLink href="/app" exact>Campaigns</NavLink>
            <NavLink href="/app/settings">Settings</NavLink>
            <NavLink href="/app/billing">
              <span className="tabular-nums">{formatUsd(credits)}</span>
              <span className="sr-only">credits left</span>
            </NavLink>
            <form action={signOut}>
              <button className="btn-quiet">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      {credits <= 0 && (
        <p role="status" className="bg-dawn-soft px-4 py-2 text-center text-sm text-dawn-ink">
          You&apos;re out of credits, so the agent has stopped sending.{" "}
          <a href="/app/billing" className="font-semibold underline">Add credits</a>
        </p>
      )}
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
