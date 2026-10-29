import { resendClient } from "@/lib/email";
import { adminClient } from "@/lib/supabase/admin";

export interface DnsRecord {
  record: string;
  type: string;
  name: string;
  value: string;
  priority?: number;
  status: string;
}

export interface SendingDomain {
  id: string;
  user_id: string;
  domain: string;
  resend_id: string | null;
  status: string;
  records: DnsRecord[];
  created_at: string;
  checked_at: string | null;
}

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function normalizeDomain(input: string) {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^.*@/, "").replace(/\/.*$/, "");
}

function toRecords(records: { record: string; type: string; name: string; value: string; priority?: number; status: string }[]) {
  return records
    .filter((r) => r.record === "SPF" || r.record === "DKIM")
    .map(({ record, type, name, value, priority, status }) => ({ record, type, name, value, priority, status }));
}

/**
 * Registers a domain in the platform's Resend account for this user. Only the
 * user who adds a domain can send from it. Admins may claim a domain that
 * already exists in Resend (e.g. one set up before this feature existed).
 */
export async function addSendingDomain(userId: string, rawDomain: string, isAdmin: boolean) {
  const domain = normalizeDomain(rawDomain);
  if (!DOMAIN_RE.test(domain)) return { error: "Enter a domain like go.acme.com." };

  const db = adminClient();
  const { data: existing } = await db.from("sending_domains").select("user_id").eq("domain", domain).maybeSingle();
  if (existing) {
    return { error: existing.user_id === userId ? "You've already added this domain." : "This domain is already connected to another account." };
  }
  const { count } = await db.from("sending_domains").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= 3) return { error: "You can connect up to 3 sending domains." };

  const resend = resendClient();
  let resendId: string | null = null;
  let status = "pending";
  let records: DnsRecord[] = [];

  const created = await resend.domains.create({ name: domain });
  if (created.data) {
    resendId = created.data.id;
    status = created.data.status;
    records = toRecords(created.data.records);
  } else {
    // Already in the Resend account but not owned by anyone here: only an admin may claim it.
    const list = await resend.domains.list();
    const match = list.data?.data.find((d) => d.name.toLowerCase() === domain);
    if (!match || !isAdmin) {
      return { error: created.error?.message ?? "Couldn't add that domain. Try again in a moment." };
    }
    const full = await resend.domains.get(match.id);
    resendId = match.id;
    status = match.status;
    records = full.data ? toRecords(full.data.records) : [];
  }

  const { error } = await db.from("sending_domains").insert({
    user_id: userId,
    domain,
    resend_id: resendId,
    status,
    records,
    checked_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return { message: `${domain} added. Add the DNS records below, then check verification.` };
}

/** Asks Resend to (re)check DNS and stores the latest status. */
export async function refreshSendingDomain(userId: string, domainId: string) {
  const db = adminClient();
  const { data: row } = await db
    .from("sending_domains")
    .select("*")
    .eq("id", domainId)
    .eq("user_id", userId)
    .single<SendingDomain>();
  if (!row?.resend_id) return { error: "Domain not found." };

  const resend = resendClient();
  if (row.status !== "verified") await resend.domains.verify(row.resend_id);
  const { data } = await resend.domains.get(row.resend_id);
  if (!data) return { error: "Couldn't reach Resend. Try again in a moment." };

  await db
    .from("sending_domains")
    .update({ status: data.status, records: toRecords(data.records), checked_at: new Date().toISOString() })
    .eq("id", row.id);
  return data.status === "verified"
    ? { message: `${row.domain} is verified. You can send from it now.` }
    : { message: `Not verified yet (status: ${data.status.replace(/_/g, " ")}). DNS changes can take up to an hour.` };
}

export async function removeSendingDomain(userId: string, domainId: string) {
  const db = adminClient();
  const { data: row } = await db
    .from("sending_domains")
    .select("*")
    .eq("id", domainId)
    .eq("user_id", userId)
    .single<SendingDomain>();
  if (!row) return;
  if (row.resend_id) await resendClient().domains.remove(row.resend_id).catch(() => undefined);
  await db.from("sending_domains").delete().eq("id", row.id);
}

/**
 * Whether this user may send from `senderEmail`: the domain must be one they
 * connected and verified. Returns a user-facing problem, or null when fine.
 */
export async function senderProblem(userId: string, senderEmail: string): Promise<string | null> {
  const domain = senderEmail.split("@").pop()?.toLowerCase();
  if (!domain || !senderEmail.includes("@")) return "Enter a full sending address, like alex@go.acme.com.";
  const { data } = await adminClient()
    .from("sending_domains")
    .select("status, user_id")
    .eq("domain", domain)
    .maybeSingle();
  if (!data || data.user_id !== userId) {
    return `Connect ${domain} under "Sending domain" on this page first, then save your address.`;
  }
  if (data.status !== "verified") {
    return `${domain} isn't verified yet. Add its DNS records, then choose "Check verification".`;
  }
  return null;
}
