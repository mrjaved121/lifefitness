-- Adds per-member "expected amount" for the current membership period, so an
-- outstanding balance can be tracked when a member is charged less than the
-- plan price (a discount, or a partial/deferred payment) at signup or
-- renewal. Backfilled from each member's current plan price since existing
-- rows predate this column.

alter table members add column if not exists expected_amount numeric not null default 0 check (expected_amount >= 0);

update members
set expected_amount = coalesce((select price from plans where plans.id = members.plan_id), 0);

-- billing_period_start marks when the current expected_amount took effect.
-- It is NOT the same as start_date: an early renewal extends start_date to
-- the day the old period ends (so paid time isn't lost), which can be days
-- or months in the future, but the renewal payment itself is recorded
-- today. Using start_date as the payment cutoff would wrongly exclude that
-- same-day payment from "paid this period." billing_period_start always
-- means "when this renewal/signup transaction happened," so a payment
-- recorded then or afterward always counts.
alter table members add column if not exists billing_period_start timestamptz not null default now();

update members set billing_period_start = start_date::timestamptz;

-- MEMBER_BALANCES: per-member outstanding balance for the current period.
-- Compares against payments.created_at (exact insert time), not
-- payment_date (a plain date, editable for accounting purposes): a payment
-- recorded just before a same-day renewal, and the renewal's own payment
-- recorded just after, would otherwise be indistinguishable at day
-- granularity and both get counted toward the new period.
--
-- security_invoker means the view runs under the querying user's own RLS
-- (the same "any staff can read" policy members/payments already have),
-- rather than bypassing it the way a SECURITY DEFINER function would.
create or replace view public.member_balances
with (security_invoker = true) as
select
  m.id as member_id,
  m.expected_amount,
  coalesce(sum(p.amount) filter (where p.created_at >= m.billing_period_start), 0) as paid_this_period,
  greatest(m.expected_amount - coalesce(sum(p.amount) filter (where p.created_at >= m.billing_period_start), 0), 0) as outstanding
from members m
left join payments p on p.member_id = m.id
group by m.id, m.expected_amount, m.billing_period_start;

grant select on public.member_balances to authenticated;

-- RENEW MEMBERSHIP RPC: now also records the plan's price as the new
-- period's expected_amount, computed server-side (not client-supplied) so a
-- member's obligation can't be understated by a tampered request. p_amount
-- (what's actually collected today) is unchanged and can still be less than
-- the plan price for a partial or deferred payment.
create or replace function public.renew_membership(
  p_member_id uuid,
  p_plan_id uuid,
  p_amount numeric,
  p_method text,
  p_notes text,
  p_recorded_by uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_duration int;
  v_price numeric;
  v_current_end date;
  v_new_start date;
  v_new_end date;
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  select duration_days, price into v_duration, v_price from plans where id = p_plan_id;
  if v_duration is null then
    raise exception 'Plan not found';
  end if;

  select end_date into v_current_end from members where id = p_member_id;
  if v_current_end is null then
    raise exception 'Member not found';
  end if;

  v_new_start := greatest(v_current_end, current_date);
  v_new_end := v_new_start + v_duration;

  update members
  set plan_id = p_plan_id,
      start_date = v_new_start,
      end_date = v_new_end,
      status = 'active',
      expected_amount = v_price,
      billing_period_start = now()
  where id = p_member_id;

  if p_amount > 0 then
    insert into payments (member_id, amount, payment_date, method, notes, recorded_by)
    values (p_member_id, p_amount, current_date, p_method, p_notes, p_recorded_by);
  end if;
end;
$$;
