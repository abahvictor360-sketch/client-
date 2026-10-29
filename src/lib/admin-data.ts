import { adminClient } from "@/lib/supabase/admin";

/** All auth users (emails, sign-up and confirmation dates), keyed by id. */
export async function loadUsers() {
  const { data } = await adminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = data?.users ?? [];
  return { users, emailById: new Map(users.map((u) => [u.id, u.email ?? "(no email)"])) };
}

function isSet(name: string) {
  const v = process.env[name];
  return Boolean(v) && v !== "REPLACE_ME";
}

/** Which integrations are configured (names only, never values). */
export function configStatus() {
  return [
    { name: "Database (Supabase server key)", ok: isSet("SUPABASE_SERVICE_ROLE_KEY"), required: true },
    { name: "Claude (website analysis, emails, replies)", ok: isSet("ANTHROPIC_API_KEY"), required: true },
    { name: "Apollo (finding prospects)", ok: isSet("APOLLO_API_KEY"), required: true },
    { name: "Resend (sending email)", ok: isSet("RESEND_API_KEY"), required: true },
    { name: "Resend webhook (replies, bounces)", ok: isSet("RESEND_WEBHOOK_SECRET"), required: true },
    { name: "Inbound reply domain", ok: isSet("INBOUND_EMAIL_DOMAIN"), required: true },
    { name: "Scheduler secret", ok: isSet("CRON_SECRET"), required: true },
    { name: "Unsubscribe link signing", ok: isSet("LINK_SIGNING_SECRET"), required: true },
    { name: "Flutterwave payments", ok: isSet("FLUTTERWAVE_SECRET_KEY") && isSet("FLUTTERWAVE_WEBHOOK_HASH"), required: false },
    { name: "Stripe payments", ok: isSet("STRIPE_SECRET_KEY") && isSet("STRIPE_WEBHOOK_SECRET"), required: false },
  ];
}

export const adminDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
export const adminDateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
