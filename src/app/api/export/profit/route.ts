import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { expenseCategoryLabel, formatMonth, monthlyProfit, sumAmounts } from "@/lib/expenses";
import { resolveRange } from "@/lib/reports";
import { todayStr } from "@/lib/format";
import { withMigrationHint } from "@/lib/migrations";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  // Expenses are owner-only; the database refuses everyone else, but say so
  // plainly rather than hand back a spreadsheet with no expenses in it.
  if (!isOwner(profile)) return NextResponse.json({ error: "Only owners can export profit and loss." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const { start, end } = resolveRange(
    { start: searchParams.get("start") ?? undefined, end: searchParams.get("end") ?? undefined },
    todayStr()
  );
  const supabase = await createClient();

  const [paymentsRes, expensesRes] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("payments")
        .select("payment_date, amount")
        .gte("payment_date", start)
        .lte("payment_date", end)
        .order("payment_date")
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("expenses")
        .select("expense_date, category, amount, notes")
        .gte("expense_date", start)
        .lte("expense_date", end)
        .order("expense_date")
        .order("id")
        .range(from, to)
    ),
  ]);

  // Fail loudly rather than hand back a spreadsheet that's missing rows.
  if (paymentsRes.error) return NextResponse.json({ error: paymentsRes.error }, { status: 500 });
  if (expensesRes.error) return NextResponse.json({ error: withMigrationHint(expensesRes.error) }, { status: 500 });

  const payments = paymentsRes.data;
  const expenses = expensesRes.data;
  const months = monthlyProfit(payments, expenses, start, end);

  const workbook = new ExcelJS.Workbook();

  const summary = workbook.addWorksheet("Profit & loss");
  summary.columns = [
    { header: "Month", key: "month", width: 16 },
    { header: "Revenue", key: "revenue", width: 16 },
    { header: "Expenses", key: "expenses", width: 16 },
    { header: "Profit", key: "profit", width: 16 },
  ];
  for (const row of months) {
    summary.addRow({ month: formatMonth(row.month), revenue: row.revenue, expenses: row.expenses, profit: row.profit });
  }
  const revenue = sumAmounts(payments);
  const spent = sumAmounts(expenses);
  summary.addRow({});
  summary.addRow({ month: "Total", revenue, expenses: spent, profit: Math.round((revenue - spent) * 100) / 100 });
  for (const key of ["revenue", "expenses", "profit"]) summary.getColumn(key).numFmt = "#,##0.00";

  const detail = workbook.addWorksheet("Expenses");
  detail.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Category", key: "category", width: 26 },
    { header: "Amount", key: "amount", width: 16 },
    { header: "Note", key: "notes", width: 40 },
  ];
  for (const e of expenses) {
    detail.addRow({ date: e.expense_date, category: expenseCategoryLabel(e.category), amount: Number(e.amount), notes: e.notes || "" });
  }
  detail.addRow({});
  detail.addRow({ category: "Total", amount: spent });
  detail.getColumn("amount").numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="profit_${start}_to_${end}.xlsx"`,
    },
  });
}
