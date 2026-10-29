-- Admins: emails listed in admin_emails get accounts.is_admin = true, both
-- for existing accounts and for anyone who signs up later with that email.

create table public.admin_emails (
  email text primary key check (email = lower(email))
);
alter table public.admin_emails enable row level security;

alter table public.accounts add column is_admin boolean not null default false;

insert into public.admin_emails (email) values ('abahvictor760@gmail.com');

update public.accounts a
   set is_admin = true
  from auth.users u
 where u.id = a.user_id
   and lower(u.email) in (select email from public.admin_emails);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into accounts (user_id, trial_ends_at, is_admin)
  values (
    new.id,
    now() + interval '3 days',
    exists (select 1 from admin_emails where email = lower(new.email))
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user from public, anon, authenticated;
