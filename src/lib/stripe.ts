import Stripe from "stripe";
import { env } from "@/lib/env";

let stripe: Stripe | undefined;

/** Null when Stripe isn't configured; top-ups are then hidden in the UI. */
export function stripeClient() {
  const key = env.stripeSecretKey();
  if (!key) return null;
  stripe ??= new Stripe(key);
  return stripe;
}
