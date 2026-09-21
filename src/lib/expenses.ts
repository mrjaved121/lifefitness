import type { ExpenseCategory } from "@/types/database";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "salaries", label: "Salaries" },
  { value: "utilities", label: "Electricity & utilities" },
  { value: "equipment", label: "Equipment" },
  { value: "maintenance", label: "Maintenance & repairs" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return EXPENSE_CATEGORIES.some((c) => c.value === value);
}

export function expenseCategoryLabel(value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// Money is stored as numeric and arrives as a number or a string; summing in
// floating point can leave 0.1 + 0.2 style dust, so totals are kept to cents.
const cents = (value: number) => Math.round(value * 100) / 100;

export function sumAmounts(rows: { amount: number | string }[]) {
  return cents(rows.reduce((sum, r) => sum + Number(r.amount), 0));
}

// ---- months ("YYYY-MM") ----

export function isMonthKey(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

// The month an /expenses?month= link points at; anything that isn't a real
// month falls back to the current one.
export function resolveMonth(value: string | undefined, today: string) {
  return isMonthKey(value) ? value : today.slice(0, 7);
}

// Date.UTC normalises an out-of-range month index across year boundaries.
export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

// First and last day of the month, as "YYYY-MM-DD" (day 0 of the next month
// is the last day of this one).
export function monthBounds(month: string) {
  const [year, m] = month.split("-").map(Number);
  return { start: `${month}-01`, end: new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10) };
}

export function formatMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Every month from start's month to end's month, inclusive.
export function monthsBetween(start: string, end: string) {
  const months: string[] = [];
  const last = end.slice(0, 7);
  for (let month = start.slice(0, 7); month <= last; month = shiftMonth(month, 1)) months.push(month);
  return months;
}

export type MonthRow = { month: string; revenue: number; expenses: number; profit: number };

// One row per month in [start, end] - including months with no activity, so a
// quiet month shows as zeros instead of vanishing. Revenue is money actually
// collected (payments recorded that month), so profit is cash-basis:
// collected minus spent.
export function monthlyProfit(
  payments: { payment_date: string; amount: number | string }[],
  expenses: { expense_date: string; amount: number | string }[],
  start: string,
  end: string
): MonthRow[] {
  const rows = new Map<string, MonthRow>(
    monthsBetween(start, end).map((month) => [month, { month, revenue: 0, expenses: 0, profit: 0 }])
  );
  for (const p of payments) {
    const row = rows.get(p.payment_date.slice(0, 7));
    if (row) row.revenue += Number(p.amount);
  }
  for (const e of expenses) {
    const row = rows.get(e.expense_date.slice(0, 7));
    if (row) row.expenses += Number(e.amount);
  }
  return [...rows.values()].map((row) => ({
    month: row.month,
    revenue: cents(row.revenue),
    expenses: cents(row.expenses),
    profit: cents(row.revenue - row.expenses),
  }));
}
