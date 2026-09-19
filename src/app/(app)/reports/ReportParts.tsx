import Link from "next/link";
import type { Entry } from "@/lib/reports";

export function ReportKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-heading">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// Horizontal bars for "how is this total split up". The numbers are printed
// next to each bar, so the bar itself is purely a visual aid.
export function BarList({ entries, format }: { entries: Entry[]; format: (value: number) => string }) {
  if (entries.length === 0) return <p className="text-sm text-muted">No data for this period.</p>;
  const max = Math.max(...entries.map((e) => e.value), 1);
  return (
    <ul className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-heading">{entry.label}</span>
            <span className="font-medium text-heading">
              {format(entry.value)}
              <span className="ml-2 font-normal text-muted">
                {entry.count} payment{entry.count === 1 ? "" : "s"}
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-app-bg">
            <div className="h-2 rounded-full bg-primary/40" style={{ width: `${Math.max((entry.value / max) * 100, 2)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReportCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-heading">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function PillLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-primary text-white" : "border border-border bg-surface text-body hover:bg-app-bg"
      }`}
    >
      {children}
    </Link>
  );
}
