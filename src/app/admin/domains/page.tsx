import Link from "next/link";
import { adminDateTime, loadUsers } from "@/lib/admin-data";
import type { SendingDomain } from "@/lib/domains";
import { adminClient } from "@/lib/supabase/admin";
import { adminRemoveDomain } from "../actions";
import { ConfirmButton } from "../ui";

export const metadata = { title: "Domains" };

export default async function AdminDomains() {
  const [{ emailById }, domains] = await Promise.all([
    loadUsers(),
    adminClient().from("sending_domains").select("*").order("created_at", { ascending: false }).returns<SendingDomain[]>(),
  ]);
  const rows = domains.data ?? [];
  return (
    <>
      <div>
        <h1 className="text-3xl sm:text-4xl">Sending domains</h1>
        <p className="mt-2 text-muted">Each user can only send from domains they connected and verified.</p>
      </div>
      <section aria-label="Sending domains" className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th scope="col">Domain</th><th scope="col">Owner</th><th scope="col">Status</th><th scope="col">Last checked</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="font-semibold" translate="no">{d.domain}</td>
                <td><Link href={`/admin/users/${d.user_id}`} className="underline-offset-4 hover:underline [overflow-wrap:anywhere]">{emailById.get(d.user_id)}</Link></td>
                <td>
                  <span className={`pill ${d.status === "verified" ? "bg-success-soft text-success" : "bg-dawn-soft text-dawn-ink"}`}>
                    {d.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="whitespace-nowrap text-muted">{d.checked_at ? adminDateTime.format(new Date(d.checked_at)) : "–"}</td>
                <td className="text-right">
                  <ConfirmButton action={adminRemoveDomain.bind(null, d.user_id, d.id)} label="Remove" confirmText={`Remove ${d.domain}? The owner can no longer send from it.`} danger />
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="!py-12 text-center text-muted">No domains connected yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
