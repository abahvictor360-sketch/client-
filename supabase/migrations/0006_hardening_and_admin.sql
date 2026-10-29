-- Security hardening plus the tables behind the admin dashboard.
--
-- 1. Users only READ their data through the API. Every write (campaigns,
--    buyer types, limits, status) goes through server code that enforces the
--    app's rules, so a user can't, e.g., set a campaign "running" or raise
--    caps by calling the REST API directly.
-- 2. RLS policies call auth.uid() once per query instead of once per row.

-- accounts ---------------------------------------------------------------
drop policy if exists "own account" on public.accounts;
drop policy if exists "update own account" on public.accounts;
create policy "read own account" on public.accounts
  for select using (user_id = (select auth.uid()));
create policy "update own account" on public.accounts
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter table public.accounts add column suspended boolean not null default false;

-- businesses -------------------------------------------------------------
drop policy if exists "own businesses" on public.businesses;
create policy "read own businesses" on public.businesses
  for select using (user_id = (select auth.uid()));
revoke insert, update, delete on public.businesses from authenticated, anon;
alter table public.businesses add constraint businesses_limits
  check (max_emails_per_day between 0 and 500 and daily_budget_cents between 0 and 1000000);

-- segments / prospects / messages / meetings / ledger: read-only to users --
drop policy if exists "own segments" on public.segments;
create policy "read own segments" on public.segments
  for select using (exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())));
drop policy if exists "own prospects" on public.prospects;
create policy "read own prospects" on public.prospects
  for select using (exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())));
drop policy if exists "own messages" on public.messages;
create policy "read own messages" on public.messages
  for select using (exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())));
drop policy if exists "own meetings" on public.meetings;
create policy "read own meetings" on public.meetings
  for select using (exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid())));
drop policy if exists "own ledger" on public.credit_ledger;
create policy "read own ledger" on public.credit_ledger
  for select using (user_id = (select auth.uid()));

revoke insert, update, delete on public.segments, public.prospects, public.messages, public.meetings,
  public.credit_ledger, public.suppressions, public.admin_emails from authenticated, anon;

create index if not exists meetings_prospect_id_idx on public.meetings (prospect_id);
create index if not exists prospects_segment_id_idx on public.prospects (segment_id);

-- Sending domains: each customer verifies their own domain through the app.
-- A customer may only send from a domain they own and have verified.
create table public.sending_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null unique check (domain = lower(domain)),
  resend_id text,
  status text not null default 'pending',
  records jsonb not null default '[]',
  created_at timestamptz not null default now(),
  checked_at timestamptz
);
create index on public.sending_domains (user_id);
alter table public.sending_domains enable row level security;
create policy "read own domains" on public.sending_domains
  for select using (user_id = (select auth.uid()));
revoke insert, update, delete on public.sending_domains from authenticated, anon;

-- Agent runs: one row per scheduler tick, for the admin System view.
create table public.agent_runs (
  id bigint generated always as identity primary key,
  trigger text not null default 'cron',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  businesses int not null default 0,
  sent int not null default 0,
  errors jsonb not null default '[]'
);
alter table public.agent_runs enable row level security;
revoke all on public.agent_runs from authenticated, anon;

-- Admin audit log: who did what, for accountability.
create table public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security;
revoke all on public.admin_actions from authenticated, anon;

-- Usage events: used to rate-limit costly actions such as website analysis.
create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index on public.usage_events (user_id, kind, created_at desc);
alter table public.usage_events enable row level security;
revoke all on public.usage_events from authenticated, anon;
