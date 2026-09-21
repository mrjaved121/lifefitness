import { GYM_NAME } from "@/lib/brand";

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

// wa.me wants the international form; local Pakistani numbers (03XX...) start with 0.
function whatsAppNumber(phone: string) {
  return phone.replace(/\D/g, "").replace(/^0/, "92");
}

export function whatsAppReminderLink(phone: string, fullName: string, endDate: string) {
  const status = daysUntil(endDate) < 0 ? "expired" : "expires";
  const message = `Hi ${fullName}, this is a reminder from ${GYM_NAME} — your membership ${status} on ${formatDate(endDate)}. Please renew soon to keep your access active.`;
  return `https://wa.me/${whatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}

// Intl puts a non-breaking space after "Rs"; a plain space reads better in a chat message.
function plainAmount(amount: number) {
  return formatCurrency(amount).replace(/ /g, " ");
}

export function whatsAppDuesLink(phone: string, fullName: string, amount: number) {
  const message = `Hi ${fullName}, this is a reminder from ${GYM_NAME} — you have an outstanding balance of ${plainAmount(amount)} on your membership. Please clear it at your earliest convenience. Thank you!`;
  return `https://wa.me/${whatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}

// For "Stopped coming": a friendly nudge, not a bill. `lastVisit` is the
// member's last check-in date, or null if they've never checked in.
export function whatsAppMissYouLink(phone: string, fullName: string, lastVisit: string | null) {
  const away = lastVisit ? `since ${formatDate(lastVisit)}` : "for a while";
  const message = `Hi ${fullName}, this is ${GYM_NAME} — we haven't seen you at the gym ${away} and we miss you! Hope all is well. Come back and train with us soon.`;
  return `https://wa.me/${whatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}

export function emailDuesLink(email: string, fullName: string, amount: number) {
  const subject = "Outstanding membership balance";
  const body = `Hi ${fullName},\n\nThis is a reminder that you have an outstanding balance of ${plainAmount(amount)} on your ${GYM_NAME} membership. Please clear it at your earliest convenience.\n\nThanks!`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function emailReminderLink(email: string, fullName: string, endDate: string) {
  const status = daysUntil(endDate) < 0 ? "expired" : "expires";
  const subject = "Membership renewal reminder";
  const body = `Hi ${fullName},\n\nThis is a reminder that your ${GYM_NAME} membership ${status} on ${formatDate(endDate)}. Please renew soon to keep your access active.\n\nThanks!`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
