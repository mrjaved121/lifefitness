-- Plan descriptions, auto-expire cron support, member photo uploads, and
-- an audit trail. Safe to run even if some of this already exists live —
-- every statement is idempotent.

-- 1. Plan description field
alter table plans add column if not exists description text;

-- 2. Audit log table
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

alter table audit_log enable row level security;

drop policy if exists "audit_log_select_super_admin" on audit_log;
create policy "audit_log_select_super_admin" on audit_log
  for select using (is_super_admin());

-- 3. Audit log triggers
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

-- 4. Member photos storage bucket
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
