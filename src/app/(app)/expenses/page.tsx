import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteExpense } from "@/lib/actions/expenses";
import { expenseCategoryLabel, formatMonth, monthBounds, resolveMonth, shiftMonth, sumAmounts } from "@/lib/expenses";
import { formatCurrency, formatDate, todayStr } from "@/lib/format";
import { groupSum } from "@/lib/reports";
import { withMigrationHint } from "@/lib/migrations";
import { BarList, ReportCard, ReportKpi } from "../reports/ReportParts";
import { ExpenseForm } from "./ExpenseForm";

type ExpenseRow = {
  id: string;
  category: string;
  amount: number | string;
  expense_date: string;
  notes: string | null;
  profiles: { full_name: string | null } | null;
};

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  // Owners only - the database refuses everyone else too; this is just so a
  // front desk user who guesses the address gets a 404 instead of an empty page.
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) notFound();

  const { month: monthParam } = await searchParams;
  const today = todayStr();
  const month = resolveMonth(monthParam, today);
  const { start, end } = monthBounds(month);
  const supabase = await createClient();

  const { data, error } = await fetchAll((from, to) =>
    supabase
      .from("expenses")
      .select("id, category, amount, expense_date, notes, profiles(full_name)")
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", { ascending: false })
      .order("id")
      .range(from, to)
  );
  const expenses = data as unknown as ExpenseRow[];

  const total = sumAmounts(expenses);
  const byCategory = groupSum(expenses, (e) => expenseCategoryLabel(e.category), (e) => Number(e.amount));
  const isCurrentMonth = month >= today.slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Expenses</h1>
          <p className="mt-1 text-sm text-body">Record what the gym spends. Only owners can see this page.</p>
        </div>
        <Link href="/reports?tab=profit" className="text-sm font-medium text-primary hover:text-primary-hover">
          See profit &amp; loss →
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-heading">Add expense</h2>
        <ExpenseForm defaultDate={today} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/expenses?month=${shiftMonth(month, -1)}`}
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-heading hover:bg-app-bg"
        >
          ← {formatMonth(shiftMonth(month, -1))}
        </Link>
        <h2 className="text-base font-semibold text-heading">{formatMonth(month)}</h2>
        {isCurrentMonth ? (
          <span className="w-24" />
        ) : (
          <Link
            href={`/expenses?month=${shiftMonth(month, 1)}`}
            className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-heading hover:bg-app-bg"
          >
            {formatMonth(shiftMonth(month, 1))} →
          </Link>
        )}
      </div>

      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{withMigrationHint(error)}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <ReportKpi label="Total spent" value={formatCurrency(total)} hint={formatMonth(month)} />
        <ReportKpi label="Entries" value={expenses.length.toLocaleString()} />
        <ReportKpi label="Biggest category" value={byCategory[0]?.label ?? "—"} hint={byCategory[0] ? formatCurrency(byCategory[0].value) : undefined} />
      </div>

      {byCategory.length > 0 && (
        <ReportCard title="By category">
          <BarList entries={byCategory} format={formatCurrency} noun="expense" />
        </ReportCard>
      )}

      <ReportCard title="All expenses">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-muted">
                <th className="py-2 pr-3">Date</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Added by</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="py-2 pl-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="py-2.5 pr-3 text-body">{formatDate(e.expense_date)}</td>
                  <td className="px-3 py-2.5 text-heading">{expenseCategoryLabel(e.category)}</td>
                  <td className="px-3 py-2.5 text-body">{e.notes || "—"}</td>
                  <td className="px-3 py-2.5 text-body">{e.profiles?.full_name || "—"}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-heading">{formatCurrency(Number(e.amount))}</td>
                  <td className="py-2.5 pl-3 text-right">
                    <form action={deleteExpense.bind(null, e.id)}>
                      <ConfirmSubmit
                        confirmText={`Delete this ${expenseCategoryLabel(e.category)} expense of ${formatCurrency(Number(e.amount))} from ${formatDate(e.expense_date)}?`}
                      >
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    No expenses recorded for {formatMonth(month)}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ReportCard>
    </div>
  );
}
