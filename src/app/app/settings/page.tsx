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
      <div><h1 className="text-3xl sm:text-4xl">Settings</h1><p className="mt-2 text-muted">Fill these in before starting your first campaign.</p></div>
      <AccountForm account={account} />
    </div>
  );
}
