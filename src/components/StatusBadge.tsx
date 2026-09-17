import { daysUntil } from "@/lib/format";
import type { MemberStatus } from "@/types/database";

type DisplayStatus = "active" | "expiring" | "expired" | "frozen";

const CONFIG: Record<DisplayStatus, { label: string; dot: string; text: string; bg: string }> = {
  active: { label: "Active", dot: "bg-success", text: "text-success", bg: "bg-success/10" },
  expiring: { label: "Expiring Soon", dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
  expired: { label: "Expired", dot: "bg-danger", text: "text-danger", bg: "bg-danger/10" },
  frozen: { label: "Frozen", dot: "bg-info", text: "text-info", bg: "bg-info/10" },
};

// `status` is what's stored; `endDate`, if given, lets a still-active member
// who is within 7 days of expiry display as "Expiring Soon" without that
// being a real stored status (see README: status is only updated on write).
export function StatusBadge({ status, endDate }: { status: MemberStatus; endDate?: string }) {
  let display: DisplayStatus = status === "frozen" ? "frozen" : status === "expired" ? "expired" : "active";
  if (display === "active" && endDate) {
    const days = daysUntil(endDate);
    if (days >= 0 && days <= 7) display = "expiring";
  }
  const cfg = CONFIG[display];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
