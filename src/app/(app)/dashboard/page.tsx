import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { LinkButton } from "@/components/LinkButton";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatCurrency,
  formatDate,
  daysUntil,
  todayStr,
  addDays,
  monthStart,
  monthLabel,
  whatsAppReminderLink,
  emailReminderLink,
} from "@/lib/format";

function greeting() {
  const hour = new Date().getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const today = todayStr();
  const weekOut = addDays(today, 7);
  const monthOut = addDays(today, 30);
  const thisMonthStart = monthStart(0);
  const lastMonthStart = monthStart(1);
  const chartStart = monthStart(5);

  const [
    totalCount,
    activeCount,
    expiredCount,
    newThisMonthCount,
    newTodayCount,
    expiringSoon,
    expiring30,
    thisMonthPayments,
    lastMonthPayments,
    chartPayments,
    recentMembers,
  ] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "expired"),
    supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", thisMonthStart),
    supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase
      .from("members")
      .select("id, full_name, end_date, phone, email")
      .eq("status", "active")
      .lte("end_date", weekOut)
      .order("end_date", { ascending: true }),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active").lte("end_date", monthOut),
    supabase.from("payments").select("amount").gte("payment_date", thisMonthStart).lte("payment_date", today),
    supabase.from("payments").select("amount").gte("payment_date", lastMonthStart).lt("payment_date", thisMonthStart),
    supabase.from("payments").select("amount, payment_date").gte("payment_date", chartStart),
    supabase
      .from("members")
      .select("id, full_name, photo_url, status, end_date, created_at, plans(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const total = totalCount.count ?? 0;
  const active = activeCount.count ?? 0;
  const expired = expiredCount.count ?? 0;
  const expiringSoonCount = expiringSoon.data?.length ?? 0;
  const expiringUrgent = expiringSoon.data?.filter((m) => daysUntil(m.end_date) <= 2).length ?? 0;
  const newToday = newTodayCount.count ?? 0;

  const thisMonthRevenue = (thisMonthPayments.data || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const lastMonthRevenue = (lastMonthPayments.data || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;

  const monthlyTotals = Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i;
    const start = monthStart(offset);
    const end = offset === 0 ? addDays(today, 1) : monthStart(offset - 1);
    const total = (chartPayments.data || [])
      .filter((p) => p.payment_date >= start && p.payment_date < end)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { label: monthLabel(offset), total };
  });
  const chartMax = Math.max(...monthlyTotals.map((m) => m.total), 1);

  const firstName = (profile?.full_name || "there").split(" ")[0];

  const kpis = [
    {
      label: "Total Members",
      value: total.toLocaleString(),
      context: newThisMonthCount.count ? `+${newThisMonthCount.count} this month` : "No new members yet",
      contextTone: newThisMonthCount.count ? "text-success" : "text-muted",
    },
    {
      label: "Active Members",
      value: active.toLocaleString(),
      context: total > 0 ? `${Math.round((active / total) * 100)}% of total` : "—",
      contextTone: "text-muted",
    },
    {
      label: "Expiring Soon",
      value: expiringSoonCount.toLocaleString(),
      context: expiringUrgent > 0 ? `${expiringUrgent} within 2 days` : "None urgent",
      contextTone: expiringUrgent > 0 ? "text-danger" : "text-muted",
    },
    {
      label: "Revenue This Month",
      value: formatCurrency(thisMonthRevenue),
      context: revenueChange === null ? "vs last month: —" : `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs last month`,
      contextTone: revenueChange === null ? "text-muted" : revenueChange >= 0 ? "text-success" : "text-danger",
    },
  ];

  const attention = [
    expiringSoonCount > 0 && {
      dot: "bg-danger",
      text: `${expiringSoonCount} membership${expiringSoonCount === 1 ? "" : "s"} expire${expiringSoonCount === 1 ? "s" : ""} this week`,
      href: "/members?status=expiring",
    },
    expired > 0 && {
      dot: "bg-warning",
      text: `${expired} membership${expired === 1 ? "" : "s"} already expired`,
      href: "/members?status=expired",
    },
    newToday > 0 && {
      dot: "bg-info",
      text: `${newToday} new member${newToday === 1 ? "" : "s"} today`,
      href: "/members",
    },
  ].filter(Boolean) as { dot: string; text: string; href: string }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-heading">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-body">Here&apos;s what&apos;s happening at your gym today.</p>
        </div>
        <LinkButton href="/members/new">+ Add Member</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-heading">{kpi.value}</p>
            <p className={`mt-1 text-xs font-medium ${kpi.contextTone}`}>{kpi.context}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold text-heading">Revenue Overview</h2>
          <p className="mt-1 text-2xl font-bold text-heading">{formatCurrency(thisMonthRevenue)}</p>
          <div className="mt-6 flex h-32 items-end gap-3">
            {monthlyTotals.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-primary/15"
                  style={{ height: `${Math.max((m.total / chartMax) * 100, 4)}%` }}
                >
                  <div className="h-full w-full rounded-t-md bg-primary/40" />
                </div>
                <span className="text-xs text-muted">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-heading">Membership Overview</h2>
          <div className="mt-4 space-y-3">
            {[
              { label: "Active", value: active },
              { label: "Expiring < 7 days", value: expiringSoonCount },
              { label: "Expiring < 30 days", value: expiring30.count ?? 0 },
              { label: "Expired", value: expired },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-body">{row.label}</span>
                <span className="font-semibold text-heading">{row.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-heading">Needs Attention</h2>
          <ul className="mt-3 divide-y divide-border">
            {attention.map((item) => (
              <li key={item.text} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                  <span className="text-sm text-heading">{item.text}</span>
                </div>
                <Link href={item.href} className="text-sm font-medium text-primary hover:text-primary-hover">
                  View members →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-heading">Recent Members</h2>
          <Link href="/members" className="text-sm font-medium text-primary hover:text-primary-hover">
            View all →
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted">
                <th className="py-2 pr-3">Member</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentMembers.data?.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 pr-3">
                    <Link href={`/members/${m.id}`} className="flex items-center gap-2.5 font-medium text-heading hover:text-primary">
                      <Avatar src={m.photo_url} name={m.full_name} className="h-7 w-7 shrink-0 text-xs" />
                      {m.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-body">{(m.plans as unknown as { name: string } | null)?.name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={m.status} endDate={m.end_date} />
                  </td>
                  <td className="px-3 py-2.5 text-body">{formatDate(m.created_at.slice(0, 10))}</td>
                </tr>
              ))}
              {(!recentMembers.data || recentMembers.data.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted">
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {expiringSoon.data && expiringSoon.data.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-heading">Renewal reminders (next 7 days)</h2>
          <ul className="mt-3 divide-y divide-border">
            {expiringSoon.data.map((m) => {
              const days = daysUntil(m.end_date);
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/members/${m.id}`} className="font-medium text-heading hover:text-primary">
                    {m.full_name}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className={days < 0 ? "text-danger" : days <= 2 ? "text-warning" : "text-muted"}>
                      {days < 0 ? `Expired ${formatDate(m.end_date)}` : days === 0 ? "Expires today" : `${days}d left`}
                    </span>
                    {m.phone && (
                      <a
                        href={whatsAppReminderLink(m.phone, m.full_name, m.end_date)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-success hover:underline"
                      >
                        WhatsApp
                      </a>
                    )}
                    {m.email && (
                      <a href={emailReminderLink(m.email, m.full_name, m.end_date)} className="text-xs font-medium text-info hover:underline">
                        Email
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
