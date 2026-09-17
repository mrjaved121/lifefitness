export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
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

// First-of-month date string, `offsetMonths` months back from the current
// UTC month (0 = this month, 1 = last month, ...). JS's Date normalizes a
// negative month index across year boundaries, so this stays correct in Jan.
export function monthStart(offsetMonths = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offsetMonths, 1))
    .toISOString()
    .slice(0, 10);
}

export function monthLabel(offsetMonths = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offsetMonths, 1)).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

export function whatsAppReminderLink(phone: string, fullName: string, endDate: string) {
  const digits = phone.replace(/\D/g, "");
  const status = daysUntil(endDate) < 0 ? "expired" : "expires";
  const message = `Hi ${fullName}, this is a reminder from GymDesk — your membership ${status} on ${formatDate(endDate)}. Please renew soon to keep your access active.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function emailReminderLink(email: string, fullName: string, endDate: string) {
  const status = daysUntil(endDate) < 0 ? "expired" : "expires";
  const subject = "Membership renewal reminder";
  const body = `Hi ${fullName},\n\nThis is a reminder that your GymDesk membership ${status} on ${formatDate(endDate)}. Please renew soon to keep your access active.\n\nThanks!`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
