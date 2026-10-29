-- Setup steps: facts the reply agent can quote, and how the user found us.

alter table public.businesses add column if not exists facts jsonb not null default '{}'::jsonb;
alter table public.accounts add column if not exists heard_from text
  check (heard_from is null or length(heard_from) <= 60);
