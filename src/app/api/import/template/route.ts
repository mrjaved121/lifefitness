import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: plans } = await supabase.from("plans").select("name").eq("is_active", true).order("name");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Members");
  sheet.columns = [
    { header: "Full name", key: "full_name", width: 28 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Email", key: "email", width: 26 },
    { header: "Address", key: "address", width: 28 },
    { header: "Plan", key: "plan", width: 18 },
    { header: "Start date", key: "start_date", width: 14 },
    { header: "Amount paid", key: "amount_paid", width: 14 },
  ];
  sheet.addRow({
    full_name: "Jane Doe",
    phone: "0300-1234567",
    email: "jane@example.com",
    address: "",
    plan: plans?.[0]?.name ?? "Monthly",
    start_date: "",
    amount_paid: "",
  });
  sheet.getRow(1).font = { bold: true };

  const help = workbook.addWorksheet("Read me");
  help.columns = [{ key: "line", width: 90 }];
  help.addRows(
    [
      "Fill in one row per member on the Members sheet, then upload this file on the Import page.",
      "Full name and Plan are required. Everything else can be left blank.",
      "Plan must match one of your active plan names exactly (case doesn't matter):",
      ...((plans || []).map((p) => `  - ${p.name}`) || []),
      "Start date, if given, must be in YYYY-MM-DD format. Leave it blank to start today.",
      "Amount paid, if given, is recorded as an immediate payment. Leave it blank (or 0) to record the member as owing the full plan price.",
    ].map((line) => [line])
  );

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="member-import-template.xlsx"`,
    },
  });
}
