-- Adds (1) an expenses table so the Reports > Profit tab can show revenue
-- minus what the gym spent, and (2) a member_activity view behind the
-- "Stopped coming" list. Every statement is idempotent (if not exists /
-- create or replace / drop if exists + create), so it is safe to run twice.
--
-- Needs 0007_pending_signups.sql to have been run first (the expense policies
-- rely on is_owner(), and the delete trigger reuses log_delete_event()).

-- ============================================================
-- 1. EXPENSES
-- Owners only, for reading AND writing: salaries and rent are exactly the
-- numbers a gym owner doesn't want front desk staff browsing. Deletes are
-- audit-logged like members/payments/plans. There is no update policy on
-- purpose - a wrong entry is deleted and re-added, so the audit trail stays
-- honest.
-- ============================================================

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in
    ('rent', 'salaries', 'utilities', 'equipment', 'maintenance', 'marketing', 'other')),
  amount numeric not null check (amount > 0),
  expense_date date not null default current_date,
  notes text,
  -- Filled in by the database from the signed-in user, so it can't be spoofed
  -- (the insert policy below also rejects any other value).
  recorded_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz default now()
);

create index if not exists idx_expenses_date on expenses(expense_date);

alter table expenses enable row level security;

drop policy if exists "expenses_select_owner" on expenses;
create policy "expenses_select_owner" on expenses
  for select using (is_owner());

drop policy if exists "expenses_insert_owner" on expenses;
create policy "expenses_insert_owner" on expenses
  for insert with check (is_owner() and (recorded_by is null or recorded_by = auth.uid()));

drop policy if exists "expenses_delete_owner" on expenses;
create policy "expenses_delete_owner" on expenses
  for delete using (is_owner());

drop trigger if exists on_expense_delete on expenses;
create trigger on_expense_delete
  before delete on expenses
  for each row execute function public.log_delete_event();

-- ============================================================
-- 2. MEMBER ACTIVITY VIEW
-- One row per member with their last check-in and total visits, so the
-- "Stopped coming" page can filter, sort and paginate in the database
-- instead of pulling every check-in into the app. Carries the member fields
-- that list shows so a single query is enough.
--
-- security_invoker: runs under the querying user's own RLS (any staff can
-- read members/plans/check_ins; nobody else can), like member_balances.
-- ============================================================

create or replace view public.member_activity
with (security_invoker = true) as
select
  m.id as member_id,
  m.member_no,
  m.full_name,
  m.phone,
  m.photo_url,
  m.status,
  m.end_date,
  m.created_at,
  p.name as plan_name,
  max(c.check_in_date) as last_visit,
  count(c.id) as total_visits
from members m
left join plans p on p.id = m.plan_id
left join check_ins c on c.member_id = m.id
group by m.id, p.id;

grant select on public.member_activity to authenticated;
