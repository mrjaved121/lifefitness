-- Register number, address and remarks carried over from the gym's Excel
-- register. Safe to run more than once.

alter table members add column if not exists address text;
alter table members add column if not exists member_no int;
alter table members add column if not exists notes text;

-- Register numbers 301-852 come from the spreadsheet; members added in the
-- app continue from 853.
create sequence if not exists members_member_no_seq start 853;
alter sequence members_member_no_seq owned by members.member_no;
alter table members alter column member_no set default nextval('members_member_no_seq');
grant usage, select on sequence members_member_no_seq to authenticated;

create index if not exists idx_members_member_no on members(member_no);
