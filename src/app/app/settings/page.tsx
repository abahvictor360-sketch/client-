import { redirect } from "next/navigation";
import type { SendingDomain } from "@/lib/domains";
import { requireUser } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";
import { AccountForm } from "./account-form";
import { DeleteAccountPanel } from "./delete-account";
import { DomainsPanel } from "./domains";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const [{ data: account }, { data: domains }] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", user.id).single<Account>(),
    supabase.from("sending_domains").select("*").order("created_at").returns<SendingDomain[]>(),
  ]);
  if (!account) return <p className="text-muted">Your account is still being set up. Refresh in a moment.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Settings</h1>
        <p className="mt-2 text-muted">
          Connect a sending domain, then fill in who the emails come from before starting your first campaign.
        </p>
      </div>
      <DomainsPanel domains={domains ?? []} />
      <AccountForm account={account} />
      <DeleteAccountPanel />
    </div>
  );
}
