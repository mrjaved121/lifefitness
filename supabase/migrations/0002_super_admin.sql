-- Adds the 'super_admin' role. Safe to run even if some of this already
-- exists live — every statement is idempotent (create or replace / drop if
-- exists + create), so it converges to the same end state regardless of
-- what's currently deployed.

-- 1. Allow the new role value
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('owner', 'front_desk', 'super_admin'));

-- 2. Role-check helper functions (SECURITY DEFINER avoids RLS recursion
-- on profiles referencing itself)
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

-- 3. Staff listing RPC (joins auth.users for email, which the client can't read directly)
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
    select p.id, u.email, p.full_name, p.role, p.created_at
    from profiles p
    join auth.users u on u.id = p.id
    order by p.created_at asc;
end;
$$;

grant execute on function public.list_staff() to authenticated;

-- 4. Re-point every RLS policy at the helper functions so 'super_admin'
-- automatically inherits owner-level access everywhere, and tighten
-- profile role-changes to super_admin only.

drop policy if exists "profiles_select_owner_all" on profiles;
create policy "profiles_select_owner_all" on profiles
  for select using (is_owner());

drop policy if exists "profiles_update_owner_all" on profiles;
drop policy if exists "profiles_update_super_admin_all" on profiles;
create policy "profiles_update_super_admin_all" on profiles
  for update using (is_super_admin());

drop policy if exists "plans_select_staff" on plans;
create policy "plans_select_staff" on plans
  for select using (is_staff());

drop policy if exists "plans_write_owner" on plans;
create policy "plans_write_owner" on plans
  for insert with check (is_owner());

drop policy if exists "plans_update_owner" on plans;
create policy "plans_update_owner" on plans
  for update using (is_owner());

drop policy if exists "plans_delete_owner" on plans;
create policy "plans_delete_owner" on plans
  for delete using (is_owner());

drop policy if exists "members_select_staff" on members;
create policy "members_select_staff" on members
  for select using (is_staff());

drop policy if exists "members_insert_staff" on members;
create policy "members_insert_staff" on members
  for insert with check (is_staff());

drop policy if exists "members_update_staff" on members;
create policy "members_update_staff" on members
  for update using (is_staff());

drop policy if exists "members_delete_owner" on members;
create policy "members_delete_owner" on members
  for delete using (is_owner());

drop policy if exists "payments_select_staff" on payments;
create policy "payments_select_staff" on payments
  for select using (is_staff());

drop policy if exists "payments_insert_staff" on payments;
create policy "payments_insert_staff" on payments
  for insert with check (is_staff());

drop policy if exists "payments_update_owner" on payments;
create policy "payments_update_owner" on payments
  for update using (is_owner());

drop policy if exists "payments_delete_owner" on payments;
create policy "payments_delete_owner" on payments
  for delete using (is_owner());
