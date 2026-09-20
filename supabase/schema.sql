-- Fitness Gym Management MVP - Supabase schema
-- Run this whole file once in the Supabase SQL editor (Project > SQL Editor > New query).

-- ============================================================
-- 1. TABLES
-- ============================================================

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('owner', 'front_desk', 'super_admin')) not null default 'front_desk',
  created_at timestamptz default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_days int not null check (duration_days > 0),
  price numeric not null check (price >= 0),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Register numbers 301-852 were imported from the gym's spreadsheet; new
-- members continue from 853.
create sequence if not exists members_member_no_seq start 853;
grant usage, select on sequence members_member_no_seq to authenticated;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  member_no int default nextval('members_member_no_seq'),
  full_name text not null,
  phone text,
  email text,
  address text,
  notes text,
  photo_url text,
  plan_id uuid references plans(id) on delete set null,
  start_date date not null,
  end_date date not null,
  status text check (status in ('active', 'expired', 'frozen')) not null default 'active',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  constraint end_after_start check (end_date >= start_date)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  payment_date date not null default current_date,
  method text check (method in ('cash', 'card', 'bank_transfer')) not null default 'cash',
  notes text,
  recorded_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- One row per member per calendar day - the unique constraint makes
-- "already checked in today" a graceful DB-level guard against
-- double-taps rather than something the app has to race to check itself.
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

-- ============================================================
-- 2. INDEXES (renewal alerts and reports filter/sort on these)
-- ============================================================

create index if not exists idx_members_end_date on members(end_date);
create index if not exists idx_members_status on members(status);
create index if not exists idx_members_member_no on members(member_no);
create index if not exists idx_payments_member_id on payments(member_id);
create index if not exists idx_payments_payment_date on payments(payment_date);

-- ============================================================
-- 3. AUTO-CREATE PROFILE ON SIGNUP
-- First user created should be manually promoted to 'owner':
--   update profiles set role = 'owner' where id = '<user-uuid>';
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'front_desk');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 4. KEEP MEMBER STATUS IN SYNC WHEN END_DATE PASSES
-- Recomputes status on every read-relevant write; also callable
-- on a schedule (see README) to flip members to 'expired' as time passes.
-- ============================================================

create or replace function public.sync_member_status()
returns void
language sql
security definer set search_path = public
as $$
  update members
  set status = 'expired'
  where status = 'active' and end_date < current_date;
$$;

-- ============================================================
-- 5. ROLE-CHECK HELPER FUNCTIONS
-- Used by both the renew_membership RPC below and the RLS policies
-- further down. These must be SECURITY DEFINER: a plain subquery on
-- `profiles` inside a POLICY defined ON `profiles` itself causes
-- Postgres to detect infinite recursion (checking the policy requires
-- evaluating the policy) and reject every query touching profiles,
-- including from other tables' policies. A SECURITY DEFINER function
-- runs as its owner, which bypasses RLS on the table it queries, so it
-- can look profiles up without re-triggering profiles' own policies.
-- ============================================================

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('owner', 'super_admin'));
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- ============================================================
-- 6. RENEW MEMBERSHIP RPC
-- Called from renewMembership() in src/lib/actions/members.ts.
-- Extends from the later of the current end_date or today (so an
-- early renewal doesn't lose remaining paid time), records the
-- payment, and reactivates the member in one transaction.
-- ============================================================

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
  v_current_end date;
  v_new_start date;
  v_new_end date;
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  select duration_days into v_duration from plans where id = p_plan_id;
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
      status = 'active'
  where id = p_member_id;

  if p_amount > 0 then
    insert into payments (member_id, amount, payment_date, method, notes, recorded_by)
    values (p_member_id, p_amount, current_date, p_method, p_notes, p_recorded_by);
  end if;
end;
$$;

grant execute on function public.renew_membership(uuid, uuid, numeric, text, text, uuid) to authenticated;

-- ============================================================
-- 7. LIST STAFF RPC
-- Called from src/app/(app)/staff/page.tsx. Joins profiles with
-- auth.users (not exposed to the client directly) so super admins
-- can see who each account belongs to before changing their role.
-- ============================================================

create or replace function public.list_staff()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_owner() then
    raise exception 'Not authorized';
  end if;

  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at
    from profiles p
    join auth.users u on u.id = p.id
    order by p.created_at asc;
end;
$$;

grant execute on function public.list_staff() to authenticated;

-- ============================================================
-- 8. AUDIT LOG TRIGGERS
-- DB-level (not app-level) so every role change and deletion is
-- captured regardless of which code path made it. SECURITY DEFINER
-- bypasses audit_log's own RLS (staff never get direct insert rights
-- on it); auth.uid() still resolves to the actual acting user because
-- it reads the request's JWT claim, not the function owner.
-- ============================================================

create or replace function public.log_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into audit_log (actor_id, action, target_table, target_id, details)
    values (auth.uid(), 'role_change', 'profiles', new.id,
            jsonb_build_object('from', old.role, 'to', new.role, 'target_name', new.full_name));
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_role_change on profiles;
create trigger on_profile_role_change
  after update on profiles
  for each row execute function public.log_role_change();

create or replace function public.log_delete_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into audit_log (actor_id, action, target_table, target_id, details)
  values (auth.uid(), 'delete', TG_TABLE_NAME, old.id, to_jsonb(old));
  return old;
end;
$$;

drop trigger if exists on_member_delete on members;
create trigger on_member_delete
  before delete on members
  for each row execute function public.log_delete_event();

drop trigger if exists on_payment_delete on payments;
create trigger on_payment_delete
  before delete on payments
  for each row execute function public.log_delete_event();

drop trigger if exists on_plan_delete on plans;
create trigger on_plan_delete
  before delete on plans
  for each row execute function public.log_delete_event();

-- ============================================================
-- 9. MEMBER PHOTOS STORAGE BUCKET
-- Called from uploadMemberPhoto() in src/lib/actions/members.ts.
-- Public bucket (photos aren't sensitive) so <img> tags can load
-- them directly; storage.objects policies still gate who can
-- upload/replace/delete.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', true)
on conflict (id) do nothing;

drop policy if exists "member_photos_select" on storage.objects;
create policy "member_photos_select" on storage.objects
  for select using (bucket_id = 'member-photos');

drop policy if exists "member_photos_insert_staff" on storage.objects;
create policy "member_photos_insert_staff" on storage.objects
  for insert with check (bucket_id = 'member-photos' and is_staff());

drop policy if exists "member_photos_update_staff" on storage.objects;
create policy "member_photos_update_staff" on storage.objects
  for update using (bucket_id = 'member-photos' and is_staff());

drop policy if exists "member_photos_delete_staff" on storage.objects;
create policy "member_photos_delete_staff" on storage.objects
  for delete using (bucket_id = 'member-photos' and is_staff());

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table plans enable row level security;
alter table members enable row level security;
alter table payments enable row level security;
alter table audit_log enable row level security;
alter table check_ins enable row level security;

-- PROFILES: everyone can see/update their own row; owners can see all
-- rows, but only super admins can change another account's role (that's
-- the whole point of a tier above owner) or other fields.
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_select_owner_all" on profiles
  for select using (is_owner());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_super_admin_all" on profiles
  for update using (is_super_admin());

-- PLANS: any signed-in staff can view; only owners can create/edit/delete.
create policy "plans_select_staff" on plans
  for select using (is_staff());

create policy "plans_write_owner" on plans
  for insert with check (is_owner());

create policy "plans_update_owner" on plans
  for update using (is_owner());

create policy "plans_delete_owner" on plans
  for delete using (is_owner());

-- MEMBERS: any signed-in staff can view/add/update; only owners can delete.
create policy "members_select_staff" on members
  for select using (is_staff());

create policy "members_insert_staff" on members
  for insert with check (is_staff());

create policy "members_update_staff" on members
  for update using (is_staff());

create policy "members_delete_owner" on members
  for delete using (is_owner());

-- PAYMENTS: any signed-in staff can view/add; only owners can update/delete.
create policy "payments_select_staff" on payments
  for select using (is_staff());

create policy "payments_insert_staff" on payments
  for insert with check (is_staff());

create policy "payments_update_owner" on payments
  for update using (is_owner());

create policy "payments_delete_owner" on payments
  for delete using (is_owner());

-- AUDIT LOG: super admins only. Rows are written exclusively by the
-- SECURITY DEFINER triggers above, so no insert/update/delete policy
-- is needed for any role.
create policy "audit_log_select_super_admin" on audit_log
  for select using (is_super_admin());

-- CHECK-INS: any signed-in staff can view/record; only owners can delete
-- (correcting a mistaken check-in).
create policy "check_ins_select_staff" on check_ins
  for select using (is_staff());

create policy "check_ins_insert_staff" on check_ins
  for insert with check (is_staff());

create policy "check_ins_delete_owner" on check_ins
  for delete using (is_owner());
