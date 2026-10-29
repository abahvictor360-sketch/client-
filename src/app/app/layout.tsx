import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { formatUsd } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: account } = await supabase.from("accounts").select("credits_cents").eq("user_id", user.id).single();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Logo href="/app" />
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/app">Campaigns</Link>
            <Link href="/app/settings">Settings</Link>
            <Link href="/app/billing" className="pill bg-accent-soft text-fg">
              {formatUsd(account?.credits_cents ?? 0)}
            </Link>
            <form action={signOut}>
              <button className="text-muted hover:text-fg">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
