# Leadloop

An autonomous outbound sales agent, modeled on Explee. Paste a website and it:

1. **Learns what you sell.** It reads the site and uses Claude with web search to research competitors (`src/lib/agent/analyze.ts`).
2. **Figures out who buys it.** It proposes 5–8 buyer segments, each with a fit score and Apollo search filters.
3. **Finds the people.** It pulls decision makers from Apollo and keeps only verified emails (`src/lib/apollo.ts`).
4. **Writes each a personal email.** It researches the prospect's company site and sends a 3-step sequence (`src/lib/agent/write.ts`).
5. **Handles replies and books meetings.** It classifies each reply, answers it, offers slots in your working hours and sends a `.ics` invite (`src/lib/agent/replies.ts`).
6. **Learns what works.** Segments move between testing, working, scaling and paused based on positive-reply rate, and sending volume follows the winners (`src/lib/agent/run.ts`).

Billing is pay as you go: $0.04 per email or AI reply, deducted from a credit balance. New accounts get $30 free, and you can top up through Stripe.

## Stack

| Part | Tool |
|---|---|
| App | Next.js 15 (App Router) on Vercel |
| Data and auth | Supabase Postgres with RLS (`supabase/migrations/0001_init.sql`) |
| AI | Claude (`claude-opus-5-5`) with structured outputs, refusal fallbacks and web search |
| Prospects | Apollo.io People API Search + Bulk People Enrichment |
| Email | Resend: sending, inbound replies and bounce/complaint webhooks |
| Scheduler | `/api/cron/agent` every 10 minutes (GitHub Actions on Vercel Hobby, Vercel Cron on Pro) |
| Payments | Stripe Checkout (optional) |

## Setup

1. **Supabase.** Create a project and run `supabase/migrations/0001_init.sql` in the SQL editor. If you want instant signup, turn off email confirmation under Auth settings.
2. **Resend.**
   - Verify a sending domain. Use a subdomain such as `go.acme.com` so cold email can't hurt your main domain's reputation.
   - Enable inbound on a second subdomain (e.g. `in.acme.com`) and set it as `INBOUND_EMAIL_DOMAIN`. Replies go to `reply+<prospect-id>@in.acme.com`.
   - Add a webhook at `https://<app>/api/webhooks/resend` for `email.received`, `email.bounced` and `email.complained`, and copy its signing secret into `RESEND_WEBHOOK_SECRET`.
3. **Apollo.** Use an API key on a plan that includes People Search and Enrichment.
4. **Stripe (optional).** Add a webhook at `https://<app>/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
5. Copy `.env.example` to `.env.local`, fill it in, then run `npm install` and `npm run dev`.
6. **Deploy.** Deploy to Vercel with the same environment variables.
7. **Schedule the agent.** It should run every 10 minutes. On Vercel Pro, change the schedule in `vercel.json` to `*/10 * * * *`. On the free Hobby plan (daily crons only), add repository secrets `APP_URL` and `CRON_SECRET`, and `.github/workflows/agent-cron.yml` will call it every 10 minutes.

In the app, fill in **Settings** (sender, sending address and postal address), paste a website, review the segments and click **Start agent**.

## Safety and deliverability

- The agent sends only on weekdays, 08:00–18:00 in your timezone. It sends at most 8 emails per business per 10-minute tick, within your daily budget and daily cap.
- Every email carries your postal address, a signed unsubscribe link and one-click `List-Unsubscribe` headers. Unsubscribes, hard bounces and complaints go on a global suppression list.
- It auto-replies only when the reply comes from the address it emailed. Prospect emails are treated as untrusted input, and the agent never promises prices or terms that aren't in your business profile.
- Sending cold email is regulated. In the EU/UK (GDPR, PECR) B2B outreach needs a legitimate-interest basis, and in the US CAN-SPAM applies. Check the rules for your markets.
