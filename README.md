# GymDesk

A small gym front-desk app: members, membership plans, payments, renewal alerts, a dashboard, staff roles, and basic exportable reports. Built with Next.js (App Router, Server Actions) and Supabase (Postgres + Auth + RLS).

## Stack

- Next.js 16 (App Router, Turbopack, Server Actions)
- Supabase (Postgres, Auth, Row Level Security)
- Tailwind CSS v4
- exceljs for Excel report exports

## Local setup

1. Install dependencies (already done if you're reading this from the generated project):
   ```
   npm install
   ```
2. Create a Supabase project (see "Supabase setup" below) and copy `.env.local.example` to `.env.local`, filling in your project's URL and anon key.
3. Run the schema in `supabase/schema.sql` against your project (SQL Editor, or `supabase db push` if using the CLI with linked project).
4. Sign up your first user at `/signup`, then promote it to `owner` (see below).
5. `npm run dev` and open http://localhost:3000.

## Supabase setup

1. Create a project at supabase.com (or run one locally with the Supabase CLI: `npx supabase init` then `npx supabase start`).
2. Open the SQL Editor and run the entire contents of `supabase/schema.sql`. This creates the four tables (`profiles`, `plans`, `members`, `payments`), indexes, a trigger that auto-creates a `profiles` row on signup, a `renew_membership` RPC used by the "Renew" button, and all Row Level Security policies.
3. Copy your project's URL and anon/public key (Project Settings > API) into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. By default Supabase requires email confirmation before a new sign-up can log in. For an internal staff tool this is usually unnecessary friction — under Authentication > Providers > Email, you can turn off "Confirm email" so accounts are usable immediately. If you leave it on, staff need to click the confirmation link in the email Supabase sends.
5. Sign up your first account at `/signup` in the app. Every new sign-up defaults to the `front_desk` role. Promote your first user to `owner` so someone can manage plans and delete records:
   ```sql
   update profiles set role = 'owner' where id = '<the user's UUID from auth.users>';
   ```
   You can find the UUID in Authentication > Users in the Supabase dashboard.
6. From then on, an owner can be created by having them sign up and having an existing owner run the same `update` (there's no in-app "promote to owner" UI in this MVP — it's a rare, high-trust action best done directly in SQL).

### Keeping membership status current

`members.status` flips to `'expired'` lazily wherever the app reads it? No — it's a stored column that only changes when the app explicitly updates it (on renewal, freeze/unfreeze, or edit). A membership whose `end_date` has passed will still show `status = 'active'` until something touches that row, even though the dashboard's "renewal alerts" and days-left math is computed live from `end_date` regardless of the stored status. If you want the `status` column itself to flip to `expired` automatically, schedule the provided helper function on a daily cron. In the Supabase dashboard: Database > Cron Jobs > New job, running:
```sql
select public.sync_member_status();
```
on a schedule like `0 0 * * *` (daily at midnight). This requires the `pg_cron` extension, which Supabase can enable from Database > Extensions.

## Roles

- **owner** — full access: manage plans, delete members/payments, everything a front_desk user can do.
- **front_desk** — can view everything, add/edit members, record payments, and renew memberships. Cannot delete members or payments, and cannot create/edit/delete plans.

Role is stored in `profiles.role` and enforced by Postgres Row Level Security — the UI hides buttons the current role can't use, but the real enforcement is in the database policies, so a front_desk user calling the API directly still can't perform an owner-only action.

## Project structure

```
src/
  app/
    login/, signup/            Public auth pages
    (app)/                     Authenticated area (sidebar shell)
      dashboard/                Stats, renewal alerts, recent payments
      members/                  List, add, detail (payments + renew), edit
      plans/                    Plan CRUD (owner-only writes)
      reports/                  Revenue + roster, Excel export
    api/export/                 Route handlers that stream .xlsx files
  lib/
    supabase/                   Browser/server/proxy Supabase clients
    actions/                    Server Actions (mutations)
    auth.ts, format.ts
  types/database.ts             Hand-written row types (not Supabase-generated)
supabase/
  schema.sql                    Full schema + RLS, run this in the SQL editor
```

## Notes / known trade-offs

- `exceljs` is used instead of the more commonly suggested `xlsx` (SheetJS) package: the `xlsx` npm package has an unpatched high-severity prototype-pollution/ReDoS advisory with no fix published to npm. Since exports here are server-generated from trusted data (never parsing an uploaded file), `exceljs` avoids that class of risk entirely.
- No photo upload UI yet — `members.photo_url` exists in the schema for future use (Supabase Storage) but isn't wired up.
- `members.status` is a stored value, not derived — see "Keeping membership status current" above.
