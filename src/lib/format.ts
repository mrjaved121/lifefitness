export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// All date-only values (Postgres `date` columns) are treated as UTC calendar
// days throughout this module, so "today" and comparisons stay consistent
// regardless of the server or browser's local timezone.
function parseDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z");
}

export function formatDate(dateStr: string) {
  return parseDate(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function daysUntil(dateStr: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = parseDate(dateStr);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function addDays(dateStr: string, days: number) {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
