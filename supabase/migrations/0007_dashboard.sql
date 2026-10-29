-- Explee-style dashboard: the "Is this your company?" confirmation step and a
-- per-user do-not-contact list.

alter table public.businesses add column if not exists confirmed_at timestamptz;
-- Campaigns that already ran don't need to go through the setup steps again.
update public.businesses set confirmed_at = now()
  where confirmed_at is null and status in ('running', 'paused');

create table if not exists public.user_suppressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- A full email address, or a bare domain that blocks everyone at it.
  value text not null check (value = lower(value) and length(value) between 3 and 254),
  created_at timestamptz not null default now(),
  unique (user_id, value)
);

alter table public.user_suppressions enable row level security;
create policy "Users read their own suppressions" on public.user_suppressions
  for select using (user_id = (select auth.uid()));
revoke insert, update, delete on public.user_suppressions from anon, authenticated;
