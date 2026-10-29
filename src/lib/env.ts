// Central access to configuration. Values are read lazily so `next build`
// succeeds without secrets; a missing value fails at the call that needs it.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  appName: () => process.env.NEXT_PUBLIC_APP_NAME ?? "Leadloop",
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  apolloApiKey: () => required("APOLLO_API_KEY"),
  resendApiKey: () => required("RESEND_API_KEY"),
  resendWebhookSecret: () => required("RESEND_WEBHOOK_SECRET"),
  // Domain whose MX records point at Resend inbound; replies land here.
  inboundDomain: () => required("INBOUND_EMAIL_DOMAIN"),
  cronSecret: () => required("CRON_SECRET"),
  // Signs unsubscribe links.
  linkSecret: () => required("LINK_SIGNING_SECRET"),
  stripeSecretKey: () => process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
};
