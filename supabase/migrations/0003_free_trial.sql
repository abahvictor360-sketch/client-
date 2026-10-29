-- Three-day free trial: no card, no subscription. While the trial is active,
-- billable actions are recorded in the ledger at $0 instead of using credits.
-- After it ends the account runs on prepaid credits as before.

alter table public.accounts add column trial_ends_at timestamptz;
update public.accounts set trial_ends_at = created_at + interval '3 days' where trial_ends_at is null;
alter table public.accounts alter column trial_ends_at set default now() + interval '3 days';
alter table public.accounts alter column trial_ends_at set not null;

-- Debit for one billable action. Returns 'trial' (free, recorded at $0),
-- 'ok' (credits debited), 'duplicate' (this reason+ref was already applied) or
-- 'insufficient' (trial over and not enough credits; nothing changes).
create or replace function public.charge_usage(
  p_user_id uuid, p_amount_cents int, p_reason text, p_ref text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  in_trial boolean;
begin
  select trial_ends_at > now() into in_trial from accounts where user_id = p_user_id;
  if in_trial then
    begin
      insert into credit_ledger (user_id, amount_cents, reason, ref)
      values (p_user_id, 0, 'trial_' || p_reason, p_ref);
    exception when unique_violation then
      return 'duplicate';
    end;
    return 'trial';
  end if;
  return apply_credits(p_user_id, -p_amount_cents, p_reason, p_ref);
end;
$$;
revoke execute on function public.charge_usage from public, anon, authenticated;

-- New accounts start a trial instead of receiving signup credits.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into accounts (user_id, trial_ends_at) values (new.id, now() + interval '3 days');
  return new;
end;
$$;
revoke execute on function public.handle_new_user from public, anon, authenticated;
