import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email";
import { suppressProspect } from "@/lib/suppress";

// One-click unsubscribe (RFC 8058) and the confirm button on /unsubscribe/[token].
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const prospectId = verifyUnsubscribeToken((await params).token);
  if (!prospectId) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  await suppressProspect(prospectId, "unsubscribe");

  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL(`/unsubscribe/${(await params).token}?done=1`, request.url), 303);
  }
  return NextResponse.json({ ok: true });
}
