import { addDays } from "./format";

export type RangePreset = "this-month" | "last-month" | "last-3-months" | "this-year";

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-3-months", label: "Last 3 months" },
  { key: "this-year", label: "This year" },
];

// `preset` is null when the range came from explicit custom dates.
export type ResolvedRange = { start: string; end: string; preset: RangePreset | null };

// Regex alone accepts "2026-02-31"; round-tripping through Date rejects it.
function isRealDate(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// First day of the month `offsetMonths` before `today`'s month (Date.UTC
// normalises a negative month index across year boundaries).
function firstOfMonth(today: string, offsetMonths: number) {
  const [year, month] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 - offsetMonths, 1)).toISOString().slice(0, 10);
}

export function resolveRange(
  params: { range?: string; start?: string; end?: string },
  today: string
): ResolvedRange {
  if (isRealDate(params.start) && isRealDate(params.end)) {
    const [start, end] = params.start <= params.end ? [params.start, params.end] : [params.end, params.start];
    return { start, end, preset: null };
  }
  const thisMonth = firstOfMonth(today, 0);
  switch (params.range) {
    case "last-month":
      return { start: firstOfMonth(today, 1), end: addDays(thisMonth, -1), preset: "last-month" };
    case "last-3-months":
      return { start: firstOfMonth(today, 2), end: today, preset: "last-3-months" };
    case "this-year":
      return { start: `${today.slice(0, 4)}-01-01`, end: today, preset: "this-year" };
    default:
      return { start: thisMonth, end: today, preset: "this-month" };
  }
}

export type ReportTab = "overview" | "members" | "revenue" | "staff";

// Staff numbers come from profiles, which only owners can read in full, so
// anyone else asking for that tab lands on the overview instead.
export function resolveTab(tab: string | undefined, canSeeStaff: boolean): ReportTab {
  if (tab === "members" || tab === "revenue") return tab;
  if (tab === "staff" && canSeeStaff) return "staff";
  return "overview";
}

export type Entry = { label: string; value: number; count: number };

export function groupSum<T>(rows: T[], label: (row: T) => string, amount: (row: T) => number): Entry[] {
  const groups = new Map<string, Entry>();
  for (const row of rows) {
    const key = label(row);
    const entry = groups.get(key) ?? { label: key, value: 0, count: 0 };
    entry.value += amount(row);
    entry.count += 1;
    groups.set(key, entry);
  }
  return [...groups.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export function methodLabel(method: string) {
  const spaced = method.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

type MemberLike = { status: string; end_date: string };

// Where every member stands today. A member still marked "active" whose end
// date has passed is counted as expired - the daily job just hasn't flipped
// the stored status yet.
export function statusSnapshot(members: MemberLike[], today: string) {
  const weekOut = addDays(today, 7);
  const snapshot = { active: 0, expiring: 0, expired: 0, frozen: 0 };
  for (const m of members) {
    if (m.status === "frozen") snapshot.frozen++;
    else if (m.status === "expired" || m.end_date < today) snapshot.expired++;
    else if (m.end_date <= weekOut) snapshot.expiring++;
    else snapshot.active++;
  }
  return snapshot;
}

// Active members whose membership ends within `days` (soonest first),
// including any already lapsed but not yet flipped to expired.
export function renewalQueue<T extends MemberLike>(members: T[], today: string, days: number): T[] {
  const limit = addDays(today, days);
  return members
    .filter((m) => m.status === "active" && m.end_date <= limit)
    .sort((a, b) => a.end_date.localeCompare(b.end_date));
}
