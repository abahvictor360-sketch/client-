-- Per-day email and reply counts for the dashboard charts. Runs as the caller
-- (security invoker), so row-level security limits it to their own messages.

create or replace function public.message_daily(p_business_id uuid, p_days int, p_tz text default 'UTC')
returns table (day date, sent bigint, replies bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select d::date as day,
         count(m.id) filter (where m.direction = 'outbound' and m.status = 'sent') as sent,
         count(m.id) filter (where m.direction = 'inbound') as replies
  from generate_series(
         (now() at time zone p_tz)::date - (least(greatest(p_days, 1), 90) - 1),
         (now() at time zone p_tz)::date,
         interval '1 day'
       ) as d
  left join public.messages m
    on m.business_id = p_business_id
   and m.created_at >= now() - make_interval(days => least(greatest(p_days, 1), 90) + 1)
   and (m.created_at at time zone p_tz)::date = d::date
  group by d
  order by d;
$$;

revoke all on function public.message_daily(uuid, int, text) from public, anon;
grant execute on function public.message_daily(uuid, int, text) to authenticated;
