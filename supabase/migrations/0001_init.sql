-- Core schema for the autonomous outbound agent.
-- Every table is scoped to the owning user through RLS; the agent itself runs
-- with the service-role key and bypasses RLS.

create extension if not exists "pgcrypto";

-- One row per user: sender identity, sending limits and the credit balance.
create table public.accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  company_name text,
  sender_name text,
  sender_title text,
  -- Address on a domain verified in Resend, e.g. "alex@outreach.acme.com".
  sender_email text,
  -- Postal address required in every commercial email (CAN-SPAM).
  postal_address text,
  timezone text not null default 'UTC',
  -- Meeting slots the agent may offer, in the account's timezone.
  working_hours_start int not null default 9 check (working_hours_start between 0 and 23),
  working_hours_end int not null default 17 check (working_hours_end between 1 and 24),
  meeting_minutes int not null default 30,
  meeting_link text,
  credits_cents int not null default 0,
  created_at timestamptz not null default now()
);

-- A product or service the agent is selling: one per website the user pastes.
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  website text not null,
  name text,
  summary text,
  offer text,
  value_props jsonb not null default '[]',
  competitors jsonb not null default '[]',
  status text not null default 'analyzing'
    check (status in ('analyzing', 'ready', 'running', 'paused', 'failed')),
  error text,
  daily_budget_cents int not null default 300,
  max_emails_per_day int not null default 50,
  created_at timestamptz not null default now()
);
create index on public.businesses (user_id);

-- A buyer segment ("Wedding planners") with the Apollo filters that find it
-- and running performance numbers the optimizer uses.
create table public.segments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  rationale text,
  fit_score int not null default 50 check (fit_score between 0 and 100),
  filters jsonb not null default '{}',
  status text not null default 'testing'
    check (status in ('testing', 'working', 'scaling', 'paused', 'exhausted')),
  apollo_page int not null default 0,
  sent int not null default 0,
  replies int not null default 0,
  positive_replies int not null default 0,
  meetings int not null default 0,
  spend_cents int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.segments (business_id);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  segment_id uuid not null references public.segments (id) on delete cascade,
  apollo_id text,
  first_name text,
  last_name text,
  title text,
  company text,
  company_domain text,
  company_description text,
  email text not null,
  linkedin_url text,
  city text,
  country text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'replied', 'interested', 'booked',
                      'not_interested', 'unsubscribed', 'bounced', 'done')),
  sequence_step int not null default 0,
  next_action_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, email)
);
create index on public.prospects (business_id, status);
create index on public.prospects (next_action_at) where status = 'contacted';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  subject text,
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'failed', 'received')),
  -- AI classification for inbound mail.
  intent text,
  provider_id text,
  rfc_message_id text,
  error text,
  created_at timestamptz not null default now()
);
create index on public.messages (prospect_id, created_at);
create index on public.messages (business_id, created_at desc);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_at timestamptz not null default now()
);
create index on public.meetings (business_id, starts_at);

-- Append-only money movements; accounts.credits_cents is the running balance.
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_cents int not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now(),
  unique (reason, ref)
);
create index on public.credit_ledger (user_id, created_at desc);

-- Global do-not-contact list (unsubscribes, hard bounces, complaints).
create table public.suppressions (
  email text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Atomically apply a credit movement. Returns 'ok', 'duplicate' when this
-- (reason, ref) pair was already applied, or 'insufficient' when a debit would
-- take the balance below zero (nothing is changed in either case).
create or replace function public.apply_credits(
  p_user_id uuid, p_amount_cents int, p_reason text, p_ref text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  updated int;
begin
  update accounts
     set credits_cents = credits_cents + p_amount_cents
   where user_id = p_user_id
     and credits_cents + p_amount_cents >= 0;
  get diagnostics updated = row_count;
  if updated = 0 then
    return 'insufficient';
  end if;

  begin
    insert into credit_ledger (user_id, amount_cents, reason, ref)
    values (p_user_id, p_amount_cents, p_reason, p_ref);
  exception when unique_violation then
    -- Undo the balance change made above.
    update accounts set credits_cents = credits_cents - p_amount_cents where user_id = p_user_id;
    return 'duplicate';
  end;
  return 'ok';
end;
$$;
revoke execute on function public.apply_credits from public, anon, authenticated;

-- New users get an account row and the signup credit grant.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into accounts (user_id) values (new.id);
  perform apply_credits(new.id, 3000, 'signup_bonus', new.id::text);
  return new;
end;
$$;
revoke execute on function public.handle_new_user from public, anon, authenticated;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security: users read and edit only their own data.
alter table public.accounts enable row level security;
alter table public.businesses enable row level security;
alter table public.segments enable row level security;
alter table public.prospects enable row level security;
alter table public.messages enable row level security;
alter table public.meetings enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.suppressions enable row level security;

create policy "own account" on public.accounts
  for select using (auth.uid() = user_id);
create policy "update own account" on public.accounts
  for update using (auth.uid() = user_id);

create policy "own businesses" on public.businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own segments" on public.segments
  for all using (exists (select 1 from businesses b where b.id = business_id and b.user_id = auth.uid()));
create policy "own prospects" on public.prospects
  for select using (exists (select 1 from businesses b where b.id = business_id and b.user_id = auth.uid()));
create policy "own messages" on public.messages
  for select using (exists (select 1 from businesses b where b.id = business_id and b.user_id = auth.uid()));
create policy "own meetings" on public.meetings
  for select using (exists (select 1 from businesses b where b.id = business_id and b.user_id = auth.uid()));
create policy "own ledger" on public.credit_ledger
  for select using (auth.uid() = user_id);

-- Users must not be able to grant themselves credits: only the profile
-- columns are writable through the API.
revoke update on public.accounts from authenticated, anon;
grant update (company_name, sender_name, sender_title, sender_email, postal_address,
              timezone, working_hours_start, working_hours_end, meeting_minutes, meeting_link)
  on public.accounts to authenticated;
revoke insert, delete on public.accounts from authenticated, anon;

-- Atomic counter updates for segment performance.
create or replace function public.bump_segment(
  p_segment_id uuid,
  p_sent int default 0,
  p_replies int default 0,
  p_positive int default 0,
  p_meetings int default 0,
  p_spend_cents int default 0
) returns void
language sql security definer set search_path = public as $$
  update segments
     set sent = sent + p_sent,
         replies = replies + p_replies,
         positive_replies = positive_replies + p_positive,
         meetings = meetings + p_meetings,
         spend_cents = spend_cents + p_spend_cents
   where id = p_segment_id;
$$;
revoke execute on function public.bump_segment from public, anon, authenticated;

-- Inbound webhooks may be retried; one row per received email.
create unique index messages_inbound_once on public.messages (prospect_id, rfc_message_id)
  where direction = 'inbound' and rfc_message_id is not null;
