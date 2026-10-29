import { NextResponse } from "next/server";
import { settleFlutterwaveTransaction } from "@/lib/flutterwave";
import { secureEqual } from "@/lib/secure-compare";

// Backup for the redirect: credits the payment even if the customer closes the
// tab before returning. Crediting is idempotent per transaction.
export async function POST(request: Request) {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  const received = request.headers.get("verif-hash") ?? "";
  if (!expected || expected === "REPLACE_ME" || !secureEqual(received, expected)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = (await request.json().catch(() => null)) as {
    event?: string;
    "event.type"?: string;
    data?: { id?: number; status?: string };
  } | null;
  const id = event?.data?.id;
  if (id && event?.data?.status === "successful") {
    await settleFlutterwaveTransaction(id);
  }
  return NextResponse.json({ received: true });
}
