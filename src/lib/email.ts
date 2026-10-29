import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { env } from "@/lib/env";
import type { Account, Prospect } from "@/lib/types";

let resend: Resend | undefined;
export function resendClient() {
  resend ??= new Resend(env.resendApiKey());
  return resend;
}

// Unsubscribe links carry the prospect id plus an HMAC so they can't be forged.
export function unsubscribeToken(prospectId: string) {
  const sig = createHmac("sha256", env.linkSecret()).update(prospectId).digest("base64url").slice(0, 32);
  return `${prospectId}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig) return null;
  const expected = unsubscribeToken(id).split(".")[1];
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

/** Address the prospect replies to; inbound mail to it is routed back to this prospect. */
export function replyAddress(prospectId: string) {
  return `reply+${prospectId}@${env.inboundDomain()}`;
}

export function prospectIdFromAddress(address: string): string | null {
  const match = address.toLowerCase().match(/reply\+([0-9a-f-]{36})@/);
  return match ? match[1] : null;
}

export function missingSenderFields(account: Account): string[] {
  const missing: string[] = [];
  if (!account.sender_name) missing.push("sender name");
  if (!account.sender_email) missing.push("sender email");
  if (!account.company_name) missing.push("company name");
  if (!account.postal_address) missing.push("postal address");
  return missing;
}

function footer(account: Account, prospectId: string) {
  const unsubscribe = `${env.appUrl()}/unsubscribe/${unsubscribeToken(prospectId)}`;
  const signature = [account.sender_name, account.sender_title, account.company_name].filter(Boolean).join(", ");
  return `\n\n--\n${signature}\n${account.postal_address}\nNot interested? Unsubscribe: ${unsubscribe}`;
}

function toHtml(text: string) {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const linked = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${linked.replace(/\n/g, "<br>")}</div>`;
}

export async function sendProspectEmail(opts: {
  account: Account;
  prospect: Pick<Prospect, "id" | "email">;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  attachments?: { filename: string; content: string; contentType: string }[];
}) {
  const { account, prospect } = opts;
  const text = opts.body + footer(account, prospect.id);
  // Mail clients POST here for one-click unsubscribe (RFC 8058).
  const oneClickUrl = `${env.appUrl()}/api/unsubscribe/${unsubscribeToken(prospect.id)}`;
  const headers: Record<string, string> = {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
  if (opts.inReplyTo) {
    headers["In-Reply-To"] = opts.inReplyTo;
    headers["References"] = opts.inReplyTo;
  }

  const { data, error } = await resendClient().emails.send({
    from: `${account.sender_name} <${account.sender_email}>`,
    to: prospect.email,
    replyTo: replyAddress(prospect.id),
    subject: opts.subject,
    text,
    html: toHtml(text),
    headers,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content),
      contentType: a.contentType,
    })),
    tags: [{ name: "prospect", value: prospect.id.replace(/-/g, "_") }],
  });
  if (error || !data) throw new Error(error?.message ?? "Resend send failed");
  return { providerId: data.id, text };
}

/** Plain notification to the account owner (e.g. "meeting booked"). */
export async function notifyOwner(account: Account, ownerEmail: string, subject: string, body: string) {
  if (!account.sender_email) return;
  await resendClient().emails.send({
    from: `${env.appName()} <${account.sender_email}>`,
    to: ownerEmail,
    subject,
    text: body,
  });
}
