import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDate,
  daysUntil,
  todayStr,
  addDays,
  whatsAppReminderLink,
  emailReminderLink,
} from "@/lib/format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayStr();
  const weekOut = addDays(today, 7);
  const monthStart = today.slice(0, 8) + "01";

  const [activeCount, expiredCount, expiringSoon, revenueRows, recentPayments] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "expired"),
    supabase
      .from("members")
      .select("id, full_name, end_date, phone, email")
      .eq("status", "active")
      .lte("end_date", weekOut)
      .order("end_date", { ascending: true }),
    supabase.from("payments").select("amount").gte("payment_date", monthStart).lte("payment_date", today),
    supabase
      .from("payments")
      .select("id, amount, payment_date, method, members(full_name)")
      .order("payment_date", { ascending: false })
      .limit(5),
  ]);

  const monthRevenue = (revenueRows.data || []).reduce((sum, p) => sum + Number(p.amount), 0);

  const stats = [
    { label: "Active members", value: activeCount.count ?? 0 },
    { label: "Expiring in 7 days", value: expiringSoon.data?.length ?? 0 },
    { label: "Expired members", value: expiredCount.count ?? 0 },
    { label: "Revenue this month", value: formatCurrency(monthRevenue) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Renewal alerts (next 7 days)</h2>
          {expiringSoon.data && expiringSoon.data.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100">
              {expiringSoon.data.map((m) => {
                const days = daysUntil(m.end_date);
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/members/${m.id}`} className="font-medium text-gray-900 hover:underline">
                      {m.full_name}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className={days < 0 ? "text-red-600" : days <= 2 ? "text-orange-600" : "text-gray-500"}>
                        {days < 0 ? `Expired ${formatDate(m.end_date)}` : days === 0 ? "Expires today" : `${days}d left`}
                      </span>
                      {m.phone && (
                        <a
                          href={whatsAppReminderLink(m.phone, m.full_name, m.end_date)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-green-700 hover:underline"
                        >
                          WhatsApp
                        </a>
                      )}
                      {m.email && (
                        <a
                          href={emailReminderLink(m.email, m.full_name, m.end_date)}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Email
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No memberships expiring soon.</p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Recent payments</h2>
          {recentPayments.data && recentPayments.data.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100">
              {recentPayments.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-gray-900">
                    {(p.members as unknown as { full_name: string } | null)?.full_name ?? "—"}
                  </span>
                  <span className="text-gray-500">
                    {formatCurrency(Number(p.amount))} · {formatDate(p.payment_date)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No payments recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
