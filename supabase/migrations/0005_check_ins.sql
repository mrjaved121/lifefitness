-- Attendance tracking. One row per member per calendar day - the unique
-- constraint makes "already checked in today" a graceful DB-level guard
-- against double-taps rather than something the app has to race to check
-- itself. Safe to run more than once.

create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  check_in_date date not null default current_date,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references profiles(id) on delete set null,
  unique (member_id, check_in_date)
);

create index if not exists idx_check_ins_member on check_ins(member_id);
create index if not exists idx_check_ins_date on check_ins(check_in_date);

alter table check_ins enable row level security;

drop policy if exists "check_ins_select_staff" on check_ins;
create policy "check_ins_select_staff" on check_ins
  for select using (is_staff());

drop policy if exists "check_ins_insert_staff" on check_ins;
create policy "check_ins_insert_staff" on check_ins
  for insert with check (is_staff());

drop policy if exists "check_ins_delete_owner" on check_ins;
create policy "check_ins_delete_owner" on check_ins
  for delete using (is_owner());
