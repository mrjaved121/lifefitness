import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { todayStr } from "@/lib/format";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const today = todayStr();
  const isDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const start = isDate(startParam) ? startParam : today.slice(0, 8) + "01";
  const end = isDate(endParam) ? endParam : today;

  const { data: payments, error } = await fetchAll((from, to) =>
    supabase
      .from("payments")
      .select("payment_date, amount, method, notes, members(full_name)")
      .gte("payment_date", start)
      .lte("payment_date", end)
      .order("payment_date", { ascending: true })
      .order("id")
      .range(from, to)
  );

  // Fail loudly rather than hand back a spreadsheet that's missing rows.
  if (error) return NextResponse.json({ error }, { status: 500 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Revenue");
  sheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Member", key: "member", width: 28 },
    { header: "Method", key: "method", width: 16 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Notes", key: "notes", width: 30 },
  ];

  let total = 0;
  for (const p of payments || []) {
    total += Number(p.amount);
    sheet.addRow({
      date: p.payment_date,
      member: (p.members as unknown as { full_name: string } | null)?.full_name ?? "",
      method: p.method,
      amount: Number(p.amount),
      notes: p.notes || "",
    });
  }
  sheet.addRow({});
  sheet.addRow({ method: "Total", amount: total });
  sheet.getColumn("amount").numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="revenue_${start}_to_${end}.xlsx"`,
    },
  });
}
