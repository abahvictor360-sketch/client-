import { NextResponse } from "next/server";
import { createFlutterwaveCheckout, flutterwaveSecret } from "@/lib/flutterwave";
import { TOP_UP_OPTIONS_CENTS } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";

// Starts a Flutterwave checkout for a credit top-up.
export async function POST(request: Request) {
  const { user } = await requireUser();
  if (!user?.email) return NextResponse.redirect(new URL("/login?next=/app/billing", request.url), 303);
  if (!flutterwaveSecret()) return NextResponse.redirect(new URL("/app/billing?payment=unavailable", request.url), 303);

  const amount = Number((await request.formData()).get("amount_cents"));
  if (!TOP_UP_OPTIONS_CENTS.includes(amount)) {
    return NextResponse.redirect(new URL("/app/billing?payment=invalid", request.url), 303);
  }
  try {
    const link = await createFlutterwaveCheckout({ userId: user.id, email: user.email, amountCents: amount });
    return NextResponse.redirect(link, 303);
  } catch (err) {
    console.error("Flutterwave checkout failed", err);
    return NextResponse.redirect(new URL("/app/billing?payment=error", request.url), 303);
  }
}
