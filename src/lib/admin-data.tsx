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

/** The "Get started" checklist steps, in order, as admin columns. */
export const SETUP_STEPS = [
  { key: "has_business", label: "Added business" },
  { key: "confirmed", label: "Confirmed setup" },
  { key: "domain_verified", label: "Verified domain" },
  { key: "sender_complete", label: "Sender details" },
  { key: "has_facts", label: "Pricing facts" },
  { key: "launched", label: "Launched" },
  { key: "has_reply", label: "Got a reply" },
] as const;

export type SetupProgress = Record<(typeof SETUP_STEPS)[number]["key"], boolean> & { user_id: string; done: number };

/** Each user's onboarding progress, keyed by user id. */
export async function loadSetupProgress() {
  const { data } = await adminClient().rpc("admin_setup_progress");
  const rows = ((Array.isArray(data) ? data : []) as Omit<SetupProgress, "done">[]).map((r) => ({
    ...r,
    done: SETUP_STEPS.filter((s) => r[s.key]).length,
  }));
  return new Map(rows.map((r) => [r.user_id, r as SetupProgress]));
}

export function SetupMeter({ progress }: { progress?: SetupProgress }) {
  const done = progress?.done ?? 0;
  const next = progress ? SETUP_STEPS.find((s) => !progress[s.key])?.label : "Added business";
  return (
    <span className="flex min-w-28 items-center gap-2" title={next ? `Next: ${next}` : "All set up"}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <span className="block h-full rounded-full bg-teal" style={{ width: `${(done / SETUP_STEPS.length) * 100}%` }} />
      </span>
      <span className="tabular-nums text-muted">{done}/{SETUP_STEPS.length}</span>
    </span>
  );
}
