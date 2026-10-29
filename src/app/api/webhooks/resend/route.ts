import { NextResponse } from "next/server";
import { handleInboundReply } from "@/lib/agent/replies";
import { env } from "@/lib/env";
import { prospectIdFromAddress, resendClient } from "@/lib/email";
import { suppressProspect } from "@/lib/suppress";

export const maxDuration = 120;

function prospectIdFromTags(tags: Record<string, string> | undefined) {
  const tagged = tags?.prospect;
  return tagged ? tagged.replace(/_/g, "-") : null;
}

// Receives inbound replies (email.received) and delivery problems from Resend.
export async function POST(request: Request) {
  const payload = await request.text();
  let event;
  try {
    event = resendClient().webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: env.resendWebhookSecret(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "email.received": {
      const recipients = [...event.data.to, ...(event.data.received_for ?? [])];
      const prospectId = recipients.map(prospectIdFromAddress).find(Boolean);
      if (!prospectId) break;

      const { data: email, error } = await resendClient().emails.receiving.get(event.data.email_id);
      if (error || !email) throw new Error(error?.message ?? "Could not load received email");
      await handleInboundReply({
        prospectId,
        from: email.from,
        subject: email.subject,
        text: email.text ?? email.html?.replace(/<[^>]+>/g, " ") ?? "",
        rfcMessageId: email.message_id,
      });
      break;
    }
    case "email.bounced": {
      const prospectId = prospectIdFromTags(event.data.tags);
      if (prospectId && event.data.bounce.type === "Permanent") await suppressProspect(prospectId, "bounce");
      break;
    }
    case "email.complained": {
      const prospectId = prospectIdFromTags(event.data.tags);
      if (prospectId) await suppressProspect(prospectId, "complaint");
      break;
    }
  }
  return NextResponse.json({ ok: true });
}
