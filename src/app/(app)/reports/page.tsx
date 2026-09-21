import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { buttonVariants } from "@/components/buttonStyles";
import { StatusBadge } from "@/components/StatusBadge";
import { PrintButton } from "@/components/PrintButton";
import { addDays, daysUntil, emailDuesLink, formatCurrency, formatDate, todayStr, whatsAppDuesLink } from "@/lib/format";
import {
  RANGE_PRESETS,
  duesQueue,
  groupSum,
  methodBreakdown,
  methodLabel,
  renewalQueue,
  resolveDate,
  resolveRange,
  resolveTab,
  statusSnapshot,
  type BalanceRow,
  type RangePreset,
  type ReportTab,
} from "@/lib/reports";
import type { MemberStatus } from "@/types/database";
import { expenseCategoryLabel, formatMonth, monthlyProfit, sumAmounts } from "@/lib/expenses";
import { withMigrationHint } from "@/lib/migrations";
import { BarList, PillLink, ReportCard, ReportKpi } from "./ReportParts";

const PAYMENT_ROW_LIMIT = 300;
const MEMBER_ROW_LIMIT = 100;

type PaymentRow = {
  id: string;
  member_id: string;
  amount: number | string;
  payment_date: string;
  method: string;
  members: { full_name: string; plans: { name: string } | null } | null;
  profiles: { full_name: string | null } | null;
};

type MemberRow = {
  id: string;
  full_name: string;
  status: MemberStatus;
  end_date: string;
  created_at: string | null;
  phone: string | null;
  email: string | null;
  plans: { name: string } | null;
};

type ExpenseRow = {
  id: string;
  category: string;
  amount: number | string;
  expense_date: string;
  notes: string | null;
};

const inputClass =
  "mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading focus:border-primary focus:outline-none";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; range?: string; start?: string; end?: string; date?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const owner = isOwner(profile);
  const today = todayStr();
  const tab = resolveTab(params.tab, owner);
  const range = resolveRange(params, today);
  const day = resolveDate(params.date, today);
  const paymentRange = tab === "daily" ? { start: day, end: day } : range;
  const supabase = await createClient();

  // Only load what the selected tab actually shows.
  const needPayments = tab !== "members";
  const needMembers = tab === "overview" || tab === "members";
  const needBalances = tab === "members";
  const empty = { data: [] as unknown[], error: null };

  const [paymentsRes, membersRes, balancesRes, checkInsRes, expensesRes] = await Promise.all([
    needPayments
      ? fetchAll((from, to) =>
          supabase
            .from("payments")
            .select("id, member_id, amount, payment_date, method, members(full_name, plans(name)), profiles(full_name)")
            .gte("payment_date", paymentRange.start)
            .lte("payment_date", paymentRange.end)
            .order("payment_date", { ascending: false })
            .order("id")
            .range(from, to)
        )
      : Promise.resolve(empty),
    needMembers
      ? fetchAll((from, to) =>
          supabase
            .from("members")
            .select("id, full_name, status, end_date, created_at, phone, email, plans(name)")
            .order("created_at", { ascending: false })
            .order("id")
            .range(from, to)
        )
      : Promise.resolve(empty),
    needBalances
      ? fetchAll((from, to) =>
          supabase.from("member_balances").select("member_id, outstanding").gt("outstanding", 0).order("member_id").range(from, to)
        )
      : Promise.resolve(empty),
    tab === "daily"
      ? supabase.from("check_ins").select("id", { count: "exact", head: true }).eq("check_in_date", day)
      : Promise.resolve({ count: null as number | null, error: null }),
    // Expenses are owner-only (resolveTab already keeps everyone else off this tab).
    tab === "profit"
      ? fetchAll((from, to) =>
          supabase
            .from("expenses")
            .select("id, category, amount, expense_date, notes")
            .gte("expense_date", range.start)
            .lte("expense_date", range.end)
            .order("expense_date", { ascending: false })
            .order("id")
            .range(from, to)
        )
      : Promise.resolve(empty),
  ]);

  const payments = paymentsRes.data as PaymentRow[];
  const members = membersRes.data as MemberRow[];
  const balances = balancesRes.data as BalanceRow[];
  const expenseRows = expensesRes.data as ExpenseRow[];
  const loadError =
    paymentsRes.error ||
    membersRes.error ||
    balancesRes.error ||
    checkInsRes.error?.message ||
    (expensesRes.error ? withMigrationHint(expensesRes.error) : null);
  const dayCheckIns = checkInsRes.count ?? 0;

  const revenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const average = payments.length ? revenue / payments.length : 0;
  const amount = (p: PaymentRow) => Number(p.amount);
  const byMethod = groupSum(payments, (p) => methodLabel(p.method), amount);
  const byPlan = groupSum(payments, (p) => p.members?.plans?.name ?? "No plan", amount);
  const byStaff = groupSum(payments, (p) => p.profiles?.full_name || "Unknown", amount);
  const dayMethods = methodBreakdown(payments);
  const dayCash = dayMethods.find((m) => m.label === methodLabel("cash"))?.value ?? 0;

  const snapshot = statusSnapshot(members, today);
  const joinedOn = (m: MemberRow) => (m.created_at ?? "").slice(0, 10);
  const newMembers = members.filter((m) => joinedOn(m) >= range.start && joinedOn(m) <= range.end);
  const renewals = renewalQueue(members, today, 30);
  const dues = duesQueue(members, balances);
  const totalOutstanding = dues.reduce((sum, d) => sum + d.outstanding, 0);

  // Profit is cash-basis: money collected in the period minus money spent in it.
  const totalExpenses = sumAmounts(expenseRows);
  const profit = Math.round((revenue - totalExpenses) * 100) / 100;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : null;
  const monthRows = monthlyProfit(payments, expenseRows, range.start, range.end);
  const byCategory = groupSum(expenseRows, (e) => expenseCategoryLabel(e.category), (e) => Number(e.amount));

  const isCustom = range.preset === null;
  function href(next: { tab?: ReportTab; preset?: RangePreset }) {
    const query = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    if (nextTab !== "overview") query.set("tab", nextTab);
    if (next.preset) {
      if (next.preset !== "this-month") query.set("range", next.preset);
    } else if (isCustom) {
      query.set("start", range.start);
      query.set("end", range.end);
    } else if (range.preset !== "this-month") {
      query.set("range", range.preset!);
    }
    const qs = query.toString();
    return qs ? `/reports?${qs}` : "/reports";
  }

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "daily", label: "Daily" },
    { key: "members", label: "Members" },
    { key: "revenue", label: "Revenue" },
    ...(owner
      ? [
          { key: "profit" as const, label: "Profit" },
          { key: "staff" as const, label: "Staff" },
        ]
      : []),
  ];

  const exportRevenueHref = `/api/export/revenue?start=${range.start}&end=${range.end}`;
  const exportProfitHref = `/api/export/profit?start=${range.start}&end=${range.end}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Reports</h1>
          <p className="mt-1 text-sm text-body">Understand membership, revenue and gym performance.</p>
        </div>
        <p className="text-sm text-muted">
          {tab === "daily" ? formatDate(day) : `${formatDate(range.start)} – ${formatDate(range.end)}`}
        </p>
      </div>

      {tab === "daily" && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <PillLink href="/reports?tab=daily" active={day === today}>
              Today
            </PillLink>
            <PillLink href={`/reports?tab=daily&date=${addDays(today, -1)}`} active={day === addDays(today, -1)}>
              Yesterday
            </PillLink>
          </div>
          <form className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value="daily" />
            <div>
              <label htmlFor="report-date" className="block text-xs font-medium text-body">
                Date
              </label>
              <input id="report-date" type="date" name="date" defaultValue={day} className={inputClass} />
            </div>
            <button type="submit" className={buttonVariants.secondary}>
              Show day
            </button>
          </form>
        </div>
      )}

      {tab !== "daily" && (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_PRESETS.map((preset) => (
            <PillLink key={preset.key} href={href({ preset: preset.key })} active={range.preset === preset.key}>
              {preset.label}
            </PillLink>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-3">
          {tab !== "overview" && <input type="hidden" name="tab" value={tab} />}
          <div>
            <label htmlFor="report-start" className="block text-xs font-medium text-body">
              From
            </label>
            <input id="report-start" type="date" name="start" defaultValue={range.start} className={inputClass} />
          </div>
          <div>
            <label htmlFor="report-end" className="block text-xs font-medium text-body">
              To
            </label>
            <input id="report-end" type="date" name="end" defaultValue={range.end} className={inputClass} />
          </div>
          <button type="submit" className={buttonVariants.secondary}>
            Apply custom range
          </button>
        </form>
      </div>
      )}

      <nav aria-label="Report sections" className="flex gap-1 overflow-x-auto border-b border-border print:hidden">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={href({ tab: t.key })}
            aria-current={tab === t.key ? "page" : undefined}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-body"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {loadError && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          Some data couldn&apos;t be loaded, so the figures below may be incomplete: {loadError}
        </p>
      )}

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportKpi label="Revenue" value={formatCurrency(revenue)} hint={`${payments.length} payments`} />
            <ReportKpi
              label="Average payment"
              value={formatCurrency(average)}
              hint={payments.length ? undefined : "No payments in this period"}
            />
            <ReportKpi label="New members" value={newMembers.length.toLocaleString()} hint="Joined in this period" />
            <ReportKpi
              label="Active members"
              value={(snapshot.active + snapshot.expiring).toLocaleString()}
              hint={`${snapshot.expiring} expiring within 7 days`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ReportCard title="Revenue by payment method">
              <BarList entries={byMethod} format={formatCurrency} />
            </ReportCard>
            <ReportCard title="Revenue by plan">
              <BarList entries={byPlan} format={formatCurrency} />
            </ReportCard>
          </div>

          <ReportCard title="Membership status today">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Active", value: snapshot.active, dot: "bg-success" },
                { label: "Expiring within 7 days", value: snapshot.expiring, dot: "bg-warning" },
                { label: "Expired", value: snapshot.expired, dot: "bg-danger" },
                { label: "Frozen", value: snapshot.frozen, dot: "bg-info" },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="flex items-center gap-2 text-xs text-muted">
                    <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                    {row.label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-heading">{row.value.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          </ReportCard>
        </div>
      )}

      {tab === "daily" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportKpi
              label="Total collected"
              value={formatCurrency(revenue)}
              hint={`${payments.length} payment${payments.length === 1 ? "" : "s"}`}
            />
            <ReportKpi label="Cash in hand" value={formatCurrency(dayCash)} hint="Cash payments only" />
            <ReportKpi label="Card & bank" value={formatCurrency(revenue - dayCash)} hint="Not in the till" />
            <ReportKpi label="Check-ins" value={dayCheckIns.toLocaleString()} hint="Visits recorded" />
          </div>

          <ReportCard title="Collections by method" action={<PrintButton>Print summary</PrintButton>}>
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted">
                  <th className="py-2 pr-3">Method</th>
                  <th className="px-3 py-2 text-right">Payments</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dayMethods.map((m) => (
                  <tr key={m.label}>
                    <td className="py-2.5 pr-3 text-heading">{m.label}</td>
                    <td className="px-3 py-2.5 text-right text-body">{m.count.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-heading">{formatCurrency(m.value)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2.5 pr-3 font-semibold text-heading">Total</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-heading">{payments.length.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-heading">{formatCurrency(revenue)}</td>
                </tr>
              </tbody>
            </table>
          </ReportCard>

          {owner && (
            <ReportCard title="Collected by staff">
              <BarList entries={byStaff} format={formatCurrency} />
            </ReportCard>
          )}

          <ReportCard title="Payments">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted">
                    <th className="py-2 pr-3">Member</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Method</th>
                    {owner && <th className="px-3 py-2">Recorded by</th>}
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.slice(0, PAYMENT_ROW_LIMIT).map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-3">
                        <Link href={`/members/${p.member_id}`} className="text-heading hover:text-primary">
                          {p.members?.full_name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-body">{p.members?.plans?.name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-body">{methodLabel(p.method)}</td>
                      {owner && <td className="px-3 py-2.5 text-body">{p.profiles?.full_name || "—"}</td>}
                      <td className="px-3 py-2.5 text-right font-medium text-heading">{formatCurrency(Number(p.amount))}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={owner ? 5 : 4} className="py-6 text-center text-muted">
                        No payments recorded on this day.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {payments.length > PAYMENT_ROW_LIMIT && (
              <p className="mt-3 text-xs text-muted">
                Showing the first {PAYMENT_ROW_LIMIT} of {payments.length.toLocaleString()}.
              </p>
            )}
          </ReportCard>
        </div>
      )}

      {tab === "members" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <ReportKpi label="New members" value={newMembers.length.toLocaleString()} hint="Joined in this period" />
            <ReportKpi label="Active" value={(snapshot.active + snapshot.expiring).toLocaleString()} />
            <ReportKpi label="Renewals due (30 days)" value={renewals.length.toLocaleString()} />
            <ReportKpi label="Expired" value={snapshot.expired.toLocaleString()} />
            <ReportKpi label="Outstanding dues" value={formatCurrency(totalOutstanding)} hint={`${dues.length} members`} />
          </div>

          <ReportCard
            title="New members"
            action={
              <a href="/api/export/members" className={buttonVariants.secondary}>
                Export roster to Excel
              </a>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted">
                    <th className="py-2 pr-3">Member</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Joined</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {newMembers.slice(0, MEMBER_ROW_LIMIT).map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-3">
                        <Link href={`/members/${m.id}`} className="font-medium text-heading hover:text-primary">
                          {m.full_name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-body">{m.plans?.name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-body">{formatDate(joinedOn(m))}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={m.status} endDate={m.end_date} />
                      </td>
                    </tr>
                  ))}
                  {newMembers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted">
                        No members joined in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {newMembers.length > MEMBER_ROW_LIMIT && (
              <p className="mt-3 text-xs text-muted">
                Showing the {MEMBER_ROW_LIMIT} most recent of {newMembers.length.toLocaleString()}. Export the roster for everyone.
              </p>
            )}
          </ReportCard>

          <ReportCard title="Renewals due in the next 30 days">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted">
                    <th className="py-2 pr-3">Member</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Ends</th>
                    <th className="px-3 py-2">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {renewals.slice(0, MEMBER_ROW_LIMIT).map((m) => {
                    const days = daysUntil(m.end_date);
                    return (
                      <tr key={m.id}>
                        <td className="py-2.5 pr-3">
                          <Link href={`/members/${m.id}`} className="font-medium text-heading hover:text-primary">
                            {m.full_name}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-body">{m.plans?.name ?? "—"}</td>
                        <td className="px-3 py-2.5 text-body">{formatDate(m.end_date)}</td>
                        <td className={`px-3 py-2.5 ${days < 0 ? "text-danger" : days <= 7 ? "text-warning" : "text-muted"}`}>
                          {days < 0 ? `Lapsed ${Math.abs(days)}d ago` : days === 0 ? "Today" : `In ${days}d`}
                        </td>
                      </tr>
                    );
                  })}
                  {renewals.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted">
                        Nothing due in the next 30 days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ReportCard>

          <ReportCard title="Members with dues">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted">
                    <th className="py-2 pr-3">Member</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Outstanding</th>
                    <th className="px-3 py-2 text-right">Remind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dues.slice(0, MEMBER_ROW_LIMIT).map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-3">
                        <Link href={`/members/${m.id}`} className="font-medium text-heading hover:text-primary">
                          {m.full_name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-body">{m.plans?.name ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={m.status} endDate={m.end_date} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-danger">{formatCurrency(m.outstanding)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="inline-flex items-center gap-3 text-xs font-medium">
                          {m.phone && (
                            <a
                              href={whatsAppDuesLink(m.phone, m.full_name, m.outstanding)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-success hover:underline"
                            >
                              WhatsApp
                            </a>
                          )}
                          {m.email && (
                            <a href={emailDuesLink(m.email, m.full_name, m.outstanding)} className="text-info hover:underline">
                              Email
                            </a>
                          )}
                          {!m.phone && !m.email && <span className="text-muted">—</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dues.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted">
                        No outstanding balances.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {dues.length > MEMBER_ROW_LIMIT && (
              <p className="mt-3 text-xs text-muted">
                Showing the {MEMBER_ROW_LIMIT} largest of {dues.length.toLocaleString()}.
              </p>
            )}
          </ReportCard>
        </div>
      )}

      {tab === "revenue" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <ReportKpi label="Revenue" value={formatCurrency(revenue)} />
            <ReportKpi label="Payments" value={payments.length.toLocaleString()} />
            <ReportKpi label="Average payment" value={formatCurrency(average)} />
          </div>

          <ReportCard title="By payment method">
            <BarList entries={byMethod} format={formatCurrency} />
          </ReportCard>

          <ReportCard
            title="Payments"
            action={
              <a href={exportRevenueHref} className={buttonVariants.primary}>
                Export to Excel
              </a>
            }
          >
            <div className="max-h-[32rem] overflow-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-xs font-medium text-muted">
                    <th className="py-2 pr-3">Date</th>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.slice(0, PAYMENT_ROW_LIMIT).map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-3 text-body">{formatDate(p.payment_date)}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/members/${p.member_id}`} className="text-heading hover:text-primary">
                          {p.members?.full_name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-body">{p.members?.plans?.name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-body">{methodLabel(p.method)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-heading">{formatCurrency(Number(p.amount))}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted">
                        No payments in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {payments.length > PAYMENT_ROW_LIMIT && (
              <p className="mt-3 text-xs text-muted">
                Showing the {PAYMENT_ROW_LIMIT} most recent of {payments.length.toLocaleString()}. The Excel export has all of them.
              </p>
            )}
          </ReportCard>
        </div>
      )}

      {tab === "profit" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportKpi label="Revenue" value={formatCurrency(revenue)} hint="Collected in this period" />
            <ReportKpi label="Expenses" value={formatCurrency(totalExpenses)} hint={`${expenseRows.length} entr${expenseRows.length === 1 ? "y" : "ies"}`} />
            <ReportKpi
              label="Profit"
              value={formatCurrency(profit)}
              tone={profit < 0 ? "danger" : profit > 0 ? "success" : undefined}
              hint={profit < 0 ? "Spent more than was collected" : undefined}
            />
            <ReportKpi label="Profit margin" value={margin === null ? "—" : `${margin}%`} hint="Profit as a share of revenue" />
          </div>

          <ReportCard
            title="Month by month"
            action={
              <a href={exportProfitHref} className={buttonVariants.primary}>
                Export to Excel
              </a>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted">
                    <th className="py-2 pr-3">Month</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">Expenses</th>
                    <th className="px-3 py-2 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthRows.map((row) => (
                    <tr key={row.month}>
                      <td className="py-2.5 pr-3 text-heading">{formatMonth(row.month)}</td>
                      <td className="px-3 py-2.5 text-right text-body">{formatCurrency(row.revenue)}</td>
                      <td className="px-3 py-2.5 text-right text-body">{formatCurrency(row.expenses)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${row.profit < 0 ? "text-danger" : "text-heading"}`}>
                        {formatCurrency(row.profit)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-heading">Total</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-heading">{formatCurrency(revenue)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-heading">{formatCurrency(totalExpenses)}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${profit < 0 ? "text-danger" : "text-heading"}`}>
                      {formatCurrency(profit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Revenue is money actually collected in each month (payments recorded), not the price of memberships sold. Profit is
              collected minus spent.
            </p>
          </ReportCard>

          <ReportCard
            title="Expenses by category"
            action={
              <Link href="/expenses" className={buttonVariants.secondary}>
                Manage expenses
              </Link>
            }
          >
            <BarList entries={byCategory} format={formatCurrency} noun="expense" />
          </ReportCard>
        </div>
      )}

      {tab === "staff" && (
        <div className="space-y-6">
          <ReportCard title="Payments recorded by staff">
            <BarList entries={byStaff} format={formatCurrency} />
          </ReportCard>
          <ReportCard title="Breakdown">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted">
                    <th className="py-2 pr-3">Staff member</th>
                    <th className="px-3 py-2 text-right">Payments</th>
                    <th className="px-3 py-2 text-right">Collected</th>
                    <th className="px-3 py-2 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byStaff.map((s) => (
                    <tr key={s.label}>
                      <td className="py-2.5 pr-3 font-medium text-heading">{s.label}</td>
                      <td className="px-3 py-2.5 text-right text-body">{s.count.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-heading">{formatCurrency(s.value)}</td>
                      <td className="px-3 py-2.5 text-right text-body">
                        {revenue > 0 ? `${Math.round((s.value / revenue) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                  {byStaff.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted">
                        No payments in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Payments are credited to whoever recorded them, including renewals. Ones with no recorded author show as Unknown.
            </p>
          </ReportCard>
        </div>
      )}
    </div>
  );
}
