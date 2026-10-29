import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { formatUsd, TOP_UP_OPTIONS_CENTS } from "@/lib/pricing";
import { stripeClient } from "@/lib/stripe";
import { requireUser } from "@/lib/supabase/server";

// Starts a Stripe Checkout session for a credit top-up.
export async function POST(request: Request) {
  const { user } = await requireUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const stripe = stripeClient();
  if (!stripe) return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });

  const form = await request.formData();
  const amount = Number(form.get("amount_cents"));
  if (!TOP_UP_OPTIONS_CENTS.includes(amount)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { user_id: user.id, amount_cents: String(amount) },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: `${env.appName()} credits (${formatUsd(amount)})` },
        },
      },
    ],
    success_url: `${env.appUrl()}/app/billing?paid=1`,
    cancel_url: `${env.appUrl()}/app/billing`,
  });
  return NextResponse.redirect(session.url!, 303);
}
