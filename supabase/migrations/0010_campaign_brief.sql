-- Per-buyer-type campaign brief, the "steer the campaign" chat, and the
-- onboarding checklist.

-- offer, customer_problem, example_clients[], positive_criteria[], negative_criteria[]
alter table public.segments add column if not exists brief jsonb not null default '{}'::jsonb;

create table if not exists public.segment_messages (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.segments (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  role text not null check (role in ('user', 'agent')),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists segment_messages_segment_idx on public.segment_messages (segment_id, created_at);
create index if not exists segment_messages_business_idx on public.segment_messages (business_id);

alter table public.segment_messages enable row level security;
create policy "Users read their own segment messages" on public.segment_messages
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = (select auth.uid()))
  );
revoke insert, update, delete on public.segment_messages from anon, authenticated;

-- When the user closed the "Get started" checklist (null = still showing).
alter table public.accounts add column if not exists onboarding_dismissed_at timestamptz;
