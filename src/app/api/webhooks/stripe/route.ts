import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { stripeClient } from "@/lib/stripe";
import { adminClient } from "@/lib/supabase/admin";

// Credits the account once Checkout is paid. The session id is the ledger ref,
// so a retried webhook never credits twice.
export async function POST(request: Request) {
  const stripe = stripeClient();
  if (!stripe) return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") ?? "",
      env.stripeWebhookSecret(),
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    if (session.payment_status === "paid" && userId && session.amount_total) {
      const { error } = await adminClient().rpc("apply_credits", {
        p_user_id: userId,
        p_amount_cents: session.amount_total,
        p_reason: "top_up",
        p_ref: session.id,
      });
      if (error) throw new Error(error.message);
    }
  }
  return NextResponse.json({ received: true });
}
