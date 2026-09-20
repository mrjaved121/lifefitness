"use server";

import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";
import { addDays, todayStr } from "@/lib/format";
import { cellToString, fieldLabel, mapHeaders, validateRow, type ImportField, type ParsedRow } from "@/lib/import";

export type ParseState = { rows: ParsedRow[]; fileError: string | null };

const MAX_ROWS = 1000;

export async function parseImportFile(_prevState: ParseState, formData: FormData): Promise<ParseState> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { rows: [], fileError: "Choose a file to upload." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  try {
    if (file.name.toLowerCase().endsWith(".csv")) {
      await workbook.csv.read(Readable.from(buffer));
    } else {
      // exceljs's type declarations predate @types/node's newer generic
      // Buffer<ArrayBufferLike>; the value itself is a real Buffer at runtime.
      await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    }
  } catch {
    return { rows: [], fileError: "Couldn't read this file. Use the template below and upload an .xlsx or .csv file." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return { rows: [], fileError: "The file has no data rows." };

  // ExcelJS rows are 1-indexed and .values has a leading empty slot at 0.
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map((h) => cellToString(h));
  const { fields, missing } = mapHeaders(headers);
  if (missing.length > 0) {
    return {
      rows: [],
      fileError: `Missing required column(s): ${missing.map(fieldLabel).join(", ")}. Use the template below.`,
    };
  }

  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("id, name, price").eq("is_active", true);
  const plansByName = new Map((plans || []).map((p) => [p.name.trim().toLowerCase(), { id: p.id, price: Number(p.price) }]));

  const today = todayStr();
  const get = (rowValues: unknown[], field: ImportField) => {
    const idx = fields[field];
    return idx === undefined ? "" : cellToString(rowValues[idx]);
  };

  const rows: ParsedRow[] = [];
  for (let r = 2; r <= sheet.rowCount && rows.length < MAX_ROWS; r++) {
    const rowValues = (sheet.getRow(r).values as unknown[]).slice(1);
    if (rowValues.every((v) => v === null || v === undefined || v === "")) continue;
    rows.push(
      validateRow(
        r,
        {
          full_name: get(rowValues, "full_name"),
          phone: get(rowValues, "phone"),
          email: get(rowValues, "email"),
          address: get(rowValues, "address"),
          plan: get(rowValues, "plan"),
          start_date: get(rowValues, "start_date"),
          amount_paid: get(rowValues, "amount_paid"),
        },
        plansByName,
        today
      )
    );
  }

  if (rows.length === 0) return { rows: [], fileError: "The file has no data rows." };
  return { rows, fileError: null };
}

export type ConfirmState = { error: string | null };

type ImportRow = {
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  plan_id: string;
  start_date: string;
  amount_paid: number;
};

const CHUNK_SIZE = 200;

export async function confirmImport(_prevState: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  let rows: ImportRow[];
  try {
    rows = JSON.parse(String(formData.get("rows") || "[]"));
  } catch {
    return { error: "Something went wrong reading the import data. Please try again." };
  }
  if (!Array.isArray(rows) || rows.length === 0) return { error: "No valid rows to import." };

  // Re-check plan_id server-side rather than trusting the client echo -
  // a plan could have been deactivated between preview and confirm.
  const { data: plans } = await supabase.from("plans").select("id, duration_days, price").eq("is_active", true);
  const planById = new Map((plans || []).map((p) => [p.id, { duration_days: p.duration_days, price: Number(p.price) }]));

  const toInsert = rows
    .filter((row) => row.full_name && planById.has(row.plan_id))
    .map((row) => ({ row, plan: planById.get(row.plan_id)! }));
  if (toInsert.length === 0) return { error: "None of the rows were valid." };

  let imported = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const { data: inserted, error } = await supabase
      .from("members")
      .insert(
        chunk.map(({ row, plan }) => ({
          full_name: row.full_name,
          phone: row.phone,
          email: row.email,
          address: row.address,
          plan_id: row.plan_id,
          start_date: row.start_date,
          end_date: addDays(row.start_date, plan.duration_days),
          status: "active",
          expected_amount: plan.price,
          created_by: user.id,
        }))
      )
      .select("id");

    if (error) {
      if (imported > 0) revalidatePath("/members");
      return { error: `Imported ${imported} member${imported === 1 ? "" : "s"} before this error: ${error.message}` };
    }
    imported += inserted?.length ?? 0;

    // A single multi-row INSERT ... RETURNING preserves input order, so the
    // Nth inserted id corresponds to the Nth row in this chunk.
    const payments = chunk
      .map((c, idx) => ({ amount_paid: c.row.amount_paid, start_date: c.row.start_date, member_id: inserted?.[idx]?.id }))
      .filter((p): p is { amount_paid: number; start_date: string; member_id: string } => !!p.member_id && p.amount_paid > 0)
      .map((p) => ({ member_id: p.member_id, amount: p.amount_paid, payment_date: p.start_date, method: "cash", recorded_by: user.id }));
    if (payments.length > 0) {
      await supabase.from("payments").insert(payments);
    }
  }

  await setFlash(`Imported ${imported} member${imported === 1 ? "" : "s"}`);
  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect("/members");
}
