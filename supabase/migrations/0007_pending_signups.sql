-- Closes two holes that let a stranger (or a front desk user) take over the app.
-- Every statement is idempotent (create or replace / drop if exists + create),
-- so it is safe to run more than once.
--
-- The holes, both reproduced against a real Postgres before this fix:
--   1. Anyone who signed up (the anon key is public, so this works straight
--      against Supabase's API, not just through /signup) was created as
--      'front_desk', and is_staff() only checked "has a profile row" - so a
--      stranger could read every member and payment.
--   2. profiles_update_own let any user update their OWN row with no column
--      restriction, so any signed-in user could set their own role to
--      'super_admin' with a single request.

-- 1. A new role for accounts nobody has approved yet.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('owner', 'front_desk', 'super_admin', 'pending'));
alter table profiles alter column role set default 'pending';

-- 2. Self-signups start as 'pending' instead of 'front_desk'. A pending user
-- can sign in and see their own profile row, nothing else, until a super
-- admin approves them from the Staff page (or you run SQL - see README).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'pending');
  return new;
end;
$$;

-- 3. "Staff" now means an approved role. Every RLS policy and RPC that used
-- is_staff() (members, payments, plans, check-ins, photos, renew_membership)
-- picks this up automatically.
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('owner', 'front_desk', 'super_admin')
  );
$$;

grant execute on function public.is_staff() to authenticated;

-- 4. Nobody using the app can change a role unless they are a super admin.
-- A trigger rather than a column-level grant so the existing super-admin
-- flow (updateStaffRole -> profiles.update) keeps working unchanged. It only
-- restricts the two roles API requests run as ('anon', 'authenticated');
-- the Supabase SQL editor and the service-role key are unaffected, which is
-- what the README's "promote the first owner" step relies on.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not is_super_admin() then
    raise exception 'Only a super admin can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_role_guard on profiles;
create trigger on_profile_role_guard
  before update on profiles
  for each row execute function public.guard_role_change();
