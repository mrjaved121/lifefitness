# GymDesk

A small gym front-desk app: members, membership plans, payments, renewal alerts, a dashboard, staff roles, exportable reports, expense and profit tracking, a "stopped coming" list, and QR member cards with scan check-in. Built with Next.js (App Router, Server Actions) and Supabase (Postgres + Auth + RLS).

## Stack

- Next.js 16 (App Router, Turbopack, Server Actions)
- Supabase (Postgres, Auth, Row Level Security)
- Tailwind CSS v4
- exceljs for Excel report exports
- qrcode (draws member QR cards) and jsqr (reads them from the camera on the Check-in screen)

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
5. Sign up your first account at `/signup` in the app. Every new sign-up starts as `pending`: it can sign in but only sees a "waiting for approval" screen, and the database hides all data from it. Promote your first user to `owner` in the SQL Editor so someone can manage plans and delete records:
   ```sql
   update profiles set role = 'owner' where id = (select id from auth.users where email = 'owner@example.com');
   ```
6. From then on, a `super_admin` approves new sign-ups and changes roles from the app's Staff page. Without a super admin, run the same `update` in the SQL Editor (set `role` to `front_desk`, `owner` or `super_admin`). The database rejects role changes from anyone else, so a staff member can't promote themselves.

### Keeping membership status current

`members.status` flips to `'expired'` lazily wherever the app reads it? No — it's a stored column that only changes when the app explicitly updates it (on renewal, freeze/unfreeze, or edit). A membership whose `end_date` has passed will still show `status = 'active'` until something touches that row, even though the dashboard's "renewal alerts" and days-left math is computed live from `end_date` regardless of the stored status. If you want the `status` column itself to flip to `expired` automatically, schedule the provided helper function on a daily cron. In the Supabase dashboard: Database > Cron Jobs > New job, running:
```sql
select public.sync_member_status();
```
on a schedule like `0 0 * * *` (daily at midnight). This requires the `pg_cron` extension, which Supabase can enable from Database > Extensions.

## Setting up a new gym (checklist)

Each gym gets its **own Supabase project** (its own database) and its **own hosting project**, both built from this same repo. Their data can never mix. Keep one codebase — don't fork the code per customer.

### Before you start

- [ ] Agree with the gym owner: price, trial length, that the data belongs to them, and that you'll take a weekly Excel backup.
- [ ] Collect: the gym's name as it should appear on receipts and messages, owner's name and email, their member register (Excel/CSV), their plans and prices, and what member number their numbering should continue from (`1` if they're new).

### 1. Database (Supabase)

- [ ] Create a new project at supabase.com named after the gym (e.g. `gym-irfan-fitness`). Save the database password somewhere safe. A free project is fine for a trial — see "Trial vs paid" below.
- [ ] Open [supabase/schema.sql](supabase/schema.sql), copy the whole file into Supabase's SQL Editor (New query) and run it. Run **only** `schema.sql` — it already contains everything in `supabase/migrations/`, and nothing in it needs editing.
- [ ] If the gym already has numbered members, continue their numbering now, **before** importing or adding anyone. Members are numbered from 1 unless you run this in the SQL Editor (here the next member will be #853):
  ```sql
  alter sequence members_member_no_seq restart with 853;
  ```
- [ ] From Project Settings > API, copy the project URL, the `anon` key and the `service_role` key. (Newer dashboards call them the "publishable" and "secret" keys.) The `service_role` key is a secret: never commit it or paste it into chat.
- [ ] Authentication > Providers > Email: turn off "Confirm email" (see "Supabase setup" above).

### 2. Hosting (Vercel)

- [ ] Vercel > Add New > Project > import this same GitHub repo. Name it after the gym.
- [ ] Add these environment variables (all listed in [.env.local.example](.env.local.example)). The first four are required; without the last two of those, the daily job that expires memberships won't run.

  | Variable | Value |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | the project URL |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon` / publishable key |
  | `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` / secret key |
  | `CRON_SECRET` | any long random string you make up |
  | `NEXT_PUBLIC_GYM_NAME` | the gym's name, e.g. `Iron House Gym` — shown on receipts, reminder messages, the sidebar, the login page and the browser tab. Optional; defaults to "GymDesk". It's baked in when the app is built, so **redeploy after changing it**. |

- [ ] Deploy. Copy the live address, then in Supabase go to Authentication > URL Configuration and set **Site URL** to it.
- [ ] Optional: give it a proper address (Vercel > Settings > Domains, e.g. `irfanfitness.yourdomain.com`) and update Site URL to match.
- [ ] Customers need Vercel **Pro**. The free Hobby plan is for non-commercial use only. One Pro account can hold every gym's project.
- If you host on DigitalOcean instead, `vercel.json` does nothing there. Set up a daily scheduled job that calls `GET /api/cron/expire-memberships` with the header `Authorization: Bearer <CRON_SECRET>`.

### 3. First accounts

- [ ] Open `<live address>/signup` and create the owner's account.
- [ ] Promote them to owner, in the Supabase SQL Editor:
  ```sql
  update profiles set role = 'owner' where id = (select id from auth.users where email = 'owner@example.com');
  ```
- [ ] Optional, only if you want support access to this gym: sign up your own account the same way and set `role = 'super_admin'`. Only `super_admin` can open the Staff and Audit pages — gym owners can't. As super admin you also approve new staff from the Staff page.
- [ ] **Turn off public sign-ups** now that the owner exists: Authentication > Sign In / Providers > turn off "Allow new users to sign up" (the wording may differ slightly by version). Strangers who sign up are only ever `pending` and can't see any data, but this stops junk accounts piling up.
- [ ] To add staff later: Supabase > Authentication > Users > Add user (email + password, tick auto-confirm). They arrive as `pending` and can't see anything until approved — choose their role on the Staff page (super admin), or in the SQL Editor. Their name shows blank until you set it:
  ```sql
  update profiles set role = 'front_desk', full_name = 'Ali' where id = (select id from auth.users where email = 'ali@example.com');
  ```

### 4. Load their data

- [ ] Sign in as the owner. Plans > add their plans and prices.
- [ ] Members > Import > download the template, paste in their register, upload. Members are numbered automatically from the counter (from 1, or wherever you restarted it in step 1).
- [ ] Spot-check five members: dates, plan, outstanding balance.

### 5. Test before handing over (5 minutes)

- [ ] Add a test member, renew them, record a payment, print the receipt, check them in, and open a WhatsApp reminder link.
- [ ] Sign in as a front-desk user in a private window and confirm the delete buttons aren't there. Then delete the test member as the owner.
- [ ] Sign up a throwaway account at `/signup` (skip if you've turned sign-ups off) and confirm it lands on "Waiting for approval" and sees no members.
- [ ] Open a receipt and a WhatsApp reminder link and confirm they show the gym's name, not "GymDesk".
- [ ] As the owner, add an expense, then check it appears in Reports > Profit. Delete it. Then sign in as front desk and confirm there's no Expenses link and Reports has no Profit tab.
- [ ] Print a member's card (their profile > Print card), then scan it on the Check-in screen with the camera or a USB scanner. Confirm the member shows as checked in.
- [ ] Check the daily job is registered: look for the cron job (`/api/cron/expire-memberships`) in the project's Vercel settings.

### 6. Hand over

- [ ] Give the owner the address and login, and walk them through it for 15 minutes: check-in, renewals, payments, the dues list, and the Excel export.

### Trial vs paid database

| | Free Supabase project | Paid (Pro) |
|---|---|---|
| Good for | A free-trial gym | A gym that pays you |
| Inactivity | Pauses after 1 week unused — un-pause it from the Supabase dashboard | Doesn't pause |
| Backups | **None** | Daily, kept 7 days |
| Limit | 2 free projects per Supabase account in total | — |

- Free is fine for a trial. **Every week**, open Reports and click "Export roster to Excel" and the revenue "Export to Excel", and save both files to a dated folder in Google Drive.
- **Upgrade the day the gym first pays you:** Supabase > Organization > Billing > upgrade. It's the same project, so nothing is moved and no data is lost.
- Pro is billed per Supabase organization: $25/month, plus about $10/month for each extra project (prices as of September 2026 — check supabase.com/pricing before quoting a customer).

### Keeping every gym up to date

- Code changes: push to GitHub and every gym's Vercel project redeploys itself.
- **Database changes do not deploy themselves.** When a new file appears in `supabase/migrations/`, run it in **each** gym's SQL Editor. Keep a simple list of which gym is on which migration number, so you never have to guess.
- A gym set up before `0007_pending_signups.sql` existed must have that file run once. Until then, anyone can sign up and read that gym's members, and any signed-in user can make themselves super admin.
- A gym set up before `0008_expenses_and_member_activity.sql` existed must have that file run once (after 0007). It adds the expenses table and the view behind "Stopped coming". A gym without it still works, but Expenses, Reports > Profit and Stopped coming show a message saying to run it, and the dashboard just leaves out the stopped-coming line.

### Known limits of this per-gym setup

- Currency is hardcoded to PKR, and WhatsApp links assume Pakistani phone numbers (`src/lib/format.ts`).
- Receipts show the gym's name (from `NEXT_PUBLIC_GYM_NAME`) but not a logo, address or phone number yet.
- "Today" is always UTC, so a check-in very late or early in the day can land on the neighbouring date in other time zones.
- Each gym is another Supabase project to pay for and another set of migrations to run. Around 5 gyms, a single shared multi-gym app becomes cheaper and easier to run.

## Expenses, "stopped coming" and QR check-in

**Expenses and profit (owners only)**

- Owners record what the gym spends under **Expenses** (rent, salaries, electricity & utilities, equipment, maintenance, marketing, other), each with a date, amount and note. Owners can add and delete. There's no edit: delete the wrong entry and add it again, which keeps the audit log honest.
- **Reports > Profit** shows revenue minus expenses for each month in the chosen range, plus expenses by category, with an **Export to Excel** (two sheets: the monthly summary and the list of expenses).
- Profit is cash-basis: "revenue" is the payments recorded in that month, not the price of memberships sold.
- Front desk staff can't see the Expenses page, the Profit tab or the export. The database enforces that, not just the menu.

**Stopped coming**

- **Members > Stopped coming** lists active members with no check-in for 7, 14, 30 or 60+ days, longest away first, each with a WhatsApp button. Members who have never checked in are listed last, and only once they joined at least that many days ago. The dashboard's "Needs attention" list shows the 14-day count.
- It's only as good as the check-in data. A gym that doesn't record visits will see nearly everyone listed here.

**QR member cards and check-in**

- Print a member's card from their profile (**Print card**), or many at once from **Members > Cards** (40 per screen, 8 per A4 sheet). Credit-card size, for card stock or to laminate. A card shows the gym name and the member's name, number and photo, but deliberately no plan or expiry date, so a renewal never means reprinting. The QR code holds only the member's random id.
- Front desk opens **Check-in** and scans with the device's camera (needs the https address, which the live site has, and camera permission) or a USB barcode/QR scanner (click the box, then scan; a USB scanner types the code like a keyboard).
- An active member is checked in at once, with a beep, and any balance due is shown. An expired or frozen member is **not** checked in automatically: the screen says why and offers "Check in anyway". A second scan the same day says "already checked in". A card from another gym says "Card not recognised".

## Roles

- **owner** — full access: manage plans, delete members/payments, record expenses and see profit, everything a front_desk user can do.
- **front_desk** — can view everything, add/edit members, record payments, and renew memberships. Cannot delete members or payments, and cannot create/edit/delete plans.
- **super_admin** — everything an owner can do, plus the Staff page (approve sign-ups, change roles) and the Audit log.
- **pending** — signed up but not approved yet. Can sign in and sees only a "waiting for approval" screen; the database returns no data to them.

Role is stored in `profiles.role` and enforced by Postgres Row Level Security — the UI hides buttons the current role can't use, but the real enforcement is in the database policies, so a front_desk user calling the API directly still can't perform an owner-only action. Changing a role is restricted to super admins (and the SQL editor) by a database trigger, so nobody can promote themselves.

## Project structure

```
src/
  app/
    login/, signup/            Public auth pages
    (app)/                     Authenticated area (sidebar shell)
      dashboard/                Stats, renewal alerts, recent payments
      members/                  List, add, detail (payments + renew), edit,
                                inactive/ (stopped coming), cards/ + [id]/card (QR cards)
      checkin/                  Scan a member's QR card (camera or USB scanner)
      plans/                    Plan CRUD (owner-only writes)
      expenses/                 Expense log (owner-only)
      reports/                  Revenue, roster, profit; Excel export
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
