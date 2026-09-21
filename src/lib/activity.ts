import { addDays, daysUntil } from "./format";

// "Stopped coming": active members with no recent check-in. Options offered on
// the page, and the default.
export const INACTIVE_DAY_OPTIONS = [7, 14, 30, 60] as const;
export const DEFAULT_INACTIVE_DAYS = 14;

export function resolveInactiveDays(raw: string | undefined) {
  const days = Number(raw);
  return (INACTIVE_DAY_OPTIONS as readonly number[]).includes(days) ? days : DEFAULT_INACTIVE_DAYS;
}

// PostgREST `or` filter for the member_activity view: last visit on or before
// the cutoff, or never visited at all AND joined on or before it (so someone
// who signed up yesterday isn't flagged for not having visited yet).
//
// Callers also filter to status = 'active' and end_date >= today: a lapsed or
// frozen member is a renewal conversation, not a "stopped coming" one.
export function inactiveFilter(days: number, today: string) {
  const cutoff = addDays(today, -days);
  return `last_visit.lte.${cutoff},and(last_visit.is.null,created_at.lt.${addDays(cutoff, 1)})`;
}

// "23 days ago" / "Yesterday" / "Never" - relative to today's UTC calendar day,
// like every other date in the app.
export function lastVisitLabel(lastVisit: string | null) {
  if (!lastVisit) return "Never";
  const ago = -daysUntil(lastVisit);
  if (ago <= 0) return "Today";
  if (ago === 1) return "Yesterday";
  return `${ago} days ago`;
}
