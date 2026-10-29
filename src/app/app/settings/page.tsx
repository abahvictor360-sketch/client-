import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";
import { AccountForm } from "./account-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: account } = await supabase.from("accounts").select("*").eq("user_id", user.id).single<Account>();
  if (!account) return <p className="text-muted">Your account is still being set up. Refresh in a moment.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
      <AccountForm account={account} />
    </div>
  );
}
