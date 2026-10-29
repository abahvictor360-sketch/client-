-- Lets the app notice an analysis that was cut off (e.g. by a function timeout).
alter table public.businesses add column analysis_started_at timestamptz not null default now();
