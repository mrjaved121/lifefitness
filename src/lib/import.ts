// Pure parsing/validation logic for bulk member import, kept independent of
// ExcelJS and Supabase so it can be unit tested directly: feed it plain
// strings/objects and check what comes back.

export type ImportField = "full_name" | "phone" | "email" | "address" | "plan" | "start_date" | "amount_paid";

const REQUIRED_FIELDS: ImportField[] = ["full_name", "plan"];

const HEADER_ALIASES: Record<string, ImportField> = {
  "full name": "full_name",
  fullname: "full_name",
  name: "full_name",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  email: "email",
  "email address": "email",
  address: "address",
  plan: "plan",
  "plan name": "plan",
  "membership plan": "plan",
  "start date": "start_date",
  startdate: "start_date",
  "join date": "start_date",
  "amount paid": "amount_paid",
  amount: "amount_paid",
  paid: "amount_paid",
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

// Matches each expected field to the column index that carries it, by
// header name rather than fixed position, so column order in the uploaded
// file doesn't matter as long as the header text is recognizable.
export function mapHeaders(headers: string[]): { fields: Partial<Record<ImportField, number>>; missing: ImportField[] } {
  const fields: Partial<Record<ImportField, number>> = {};
  headers.forEach((header, index) => {
    const field = HEADER_ALIASES[normalizeHeader(header)];
    if (field && fields[field] === undefined) fields[field] = index;
  });
  const missing = REQUIRED_FIELDS.filter((field) => fields[field] === undefined);
  return { fields, missing };
}

export function fieldLabel(field: ImportField): string {
  const labels: Record<ImportField, string> = {
    full_name: "Full name",
    phone: "Phone",
    email: "Email",
    address: "Address",
    plan: "Plan",
    start_date: "Start date",
    amount_paid: "Amount paid",
  };
  return labels[field];
}

// A cell can be a string, number, Date (ExcelJS gives real Date objects for
// date-formatted spreadsheet cells), rich text, or a formula result - reduce
// all of those to the plain string validateRow() expects.
export function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("");
    if (v.result !== undefined) return cellToString(v.result);
    if (v.text !== undefined) return String(v.text);
    return "";
  }
  return String(value).trim();
}

// Regex alone accepts "2026-02-31"; round-tripping through Date rejects it.
export function isRealDateStr(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type RawRowInput = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  plan: string;
  start_date: string;
  amount_paid: string;
};

export type ParsedRow = {
  rowNumber: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  planName: string;
  plan_id: string | null;
  start_date: string;
  amount_paid: number;
  errors: string[];
};

export function validateRow(
  rowNumber: number,
  raw: RawRowInput,
  plansByName: Map<string, { id: string; price: number }>,
  today: string
): ParsedRow {
  const errors: string[] = [];
  const full_name = raw.full_name.trim();
  if (!full_name) errors.push("Missing name");

  const planName = raw.plan.trim();
  const plan = planName ? plansByName.get(planName.toLowerCase()) : undefined;
  if (!planName) errors.push("Missing plan");
  else if (!plan) errors.push(`Unknown plan "${planName}"`);

  const rawDate = raw.start_date.trim();
  let start_date = today;
  if (rawDate) {
    if (isRealDateStr(rawDate)) start_date = rawDate;
    else errors.push(`Invalid start date "${rawDate}" (use YYYY-MM-DD)`);
  }

  let amount_paid = 0;
  const rawAmount = raw.amount_paid.trim();
  if (rawAmount) {
    const n = Number(rawAmount);
    if (!Number.isFinite(n) || n < 0) errors.push(`Invalid amount "${rawAmount}"`);
    else amount_paid = n;
  }

  return {
    rowNumber,
    full_name,
    phone: raw.phone.trim() || null,
    email: raw.email.trim() || null,
    address: raw.address.trim() || null,
    planName,
    plan_id: plan?.id ?? null,
    start_date,
    amount_paid,
    errors,
  };
}
