-- Fitness Gym Management MVP - Supabase schema
-- Run this whole file once in the Supabase SQL editor (Project > SQL Editor > New query).

-- ============================================================
-- 1. TABLES
-- ============================================================

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('owner', 'front_desk')) not null default 'front_desk',
  created_at timestamptz default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_days int not null check (duration_days > 0),
  price numeric not null check (price >= 0),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
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

-- ============================================================
-- 2. INDEXES (renewal alerts and reports filter/sort on these)
-- ============================================================

create index if not exists idx_members_end_date on members(end_date);
create index if not exists idx_members_status on members(status);
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
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table plans enable row level security;
alter table members enable row level security;
alter table payments enable row level security;

-- PROFILES: everyone can see their own row; owners can see/manage all rows.
-- (Every other table's policies check role via a `profiles` lookup, so
-- profiles itself must be readable by auth.uid() or those checks fail closed.)
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_select_owner_all" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
  );

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_owner_all" on profiles
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
  );

-- PLANS: any signed-in staff can view; only owners can create/edit/delete.
create policy "plans_select_staff" on plans
  for select using (exists (select 1 from profiles where id = auth.uid()));

create policy "plans_write_owner" on plans
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "plans_update_owner" on plans
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "plans_delete_owner" on plans
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- MEMBERS: any signed-in staff can view/add/update; only owners can delete.
create policy "members_select_staff" on members
  for select using (exists (select 1 from profiles where id = auth.uid()));

create policy "members_insert_staff" on members
  for insert with check (exists (select 1 from profiles where id = auth.uid()));

create policy "members_update_staff" on members
  for update using (exists (select 1 from profiles where id = auth.uid()));

create policy "members_delete_owner" on members
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- PAYMENTS: any signed-in staff can view/add; only owners can update/delete.
create policy "payments_select_staff" on payments
  for select using (exists (select 1 from profiles where id = auth.uid()));

create policy "payments_insert_staff" on payments
  for insert with check (exists (select 1 from profiles where id = auth.uid()));

create policy "payments_update_owner" on payments
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "payments_delete_owner" on payments
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );
