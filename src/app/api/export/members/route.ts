import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetchAll";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: members, error } = await fetchAll((from, to) =>
    supabase
      .from("members")
      .select("full_name, phone, email, start_date, end_date, status, plans(name)")
      .order("full_name", { ascending: true })
      .order("id")
      .range(from, to)
  );

  // Fail loudly rather than hand back a spreadsheet that's missing rows.
  if (error) return NextResponse.json({ error }, { status: 500 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Members");
  sheet.columns = [
    { header: "Name", key: "name", width: 28 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Email", key: "email", width: 26 },
    { header: "Plan", key: "plan", width: 18 },
    { header: "Start date", key: "start", width: 14 },
    { header: "End date", key: "end", width: 14 },
    { header: "Status", key: "status", width: 12 },
  ];

  for (const m of members || []) {
    sheet.addRow({
      name: m.full_name,
      phone: m.phone || "",
      email: m.email || "",
      plan: (m.plans as unknown as { name: string } | null)?.name ?? "",
      start: m.start_date,
      end: m.end_date,
      status: m.status,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="members.xlsx"`,
    },
  });
}
