-- Admin-only reporting: onboarding progress per user and sitewide daily
-- activity. Only the server key (service_role) may call these.

create or replace function public.admin_setup_progress()
returns table (
  user_id uuid,
  has_business boolean,
  confirmed boolean,
  domain_verified boolean,
  sender_complete boolean,
  has_facts boolean,
  launched boolean,
  has_reply boolean
)
language sql
stable
set search_path = public
as $$
  select a.user_id,
    exists (select 1 from businesses b where b.user_id = a.user_id),
    exists (select 1 from businesses b where b.user_id = a.user_id and b.confirmed_at is not null),
    exists (select 1 from sending_domains d where d.user_id = a.user_id and d.status = 'verified'),
    (a.sender_name is not null and a.company_name is not null and a.sender_email is not null and a.postal_address is not null),
    exists (select 1 from businesses b where b.user_id = a.user_id and b.facts <> '{}'::jsonb),
    exists (select 1 from businesses b where b.user_id = a.user_id and b.status = 'running')
      or exists (select 1 from segments s join businesses b on b.id = s.business_id where b.user_id = a.user_id and s.sent > 0),
    exists (select 1 from messages m join businesses b on b.id = m.business_id where b.user_id = a.user_id and m.direction = 'inbound')
  from accounts a;
$$;

create or replace function public.admin_message_daily(p_days int)
returns table (day date, sent bigint, replies bigint)
language sql
stable
set search_path = public
as $$
  select d::date,
         count(m.id) filter (where m.direction = 'outbound' and m.status = 'sent'),
         count(m.id) filter (where m.direction = 'inbound')
  from generate_series(current_date - (least(greatest(p_days, 1), 90) - 1), current_date, interval '1 day') d
  left join messages m
    on m.created_at >= current_date - least(greatest(p_days, 1), 90)
   and m.created_at::date = d::date
  group by d
  order by d;
$$;

revoke all on function public.admin_setup_progress() from public, anon, authenticated;
revoke all on function public.admin_message_daily(int) from public, anon, authenticated;
grant execute on function public.admin_setup_progress() to service_role;
grant execute on function public.admin_message_daily(int) to service_role;
