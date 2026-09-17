import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, todayStr } from "@/lib/format";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { start, end } = await searchParams;
  const today = todayStr();
  const isDate = (value: string | undefined): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const rangeStart = isDate(start) ? start : today.slice(0, 8) + "01";
  const rangeEnd = isDate(end) ? end : today;

  const supabase = await createClient();

  const [paymentsRes, statusRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, payment_date, method, members(full_name)")
      .gte("payment_date", rangeStart)
      .lte("payment_date", rangeEnd)
      .order("payment_date", { ascending: false }),
    supabase.from("members").select("status"),
  ]);

  const payments = paymentsRes.data || [];
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const statusCounts = { active: 0, expired: 0, frozen: 0 };
  for (const m of statusRes.data || []) {
    statusCounts[m.status as keyof typeof statusCounts]++;
  }

  const exportQuery = `start=${rangeStart}&end=${rangeEnd}`;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Revenue</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">From</label>
            <input
              type="date"
              name="start"
              defaultValue={rangeStart}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">To</label>
            <input
              type="date"
              name="end"
              defaultValue={rangeEnd}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100">
            Apply
          </button>
          <a
            href={`/api/export/revenue?${exportQuery}`}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Export to Excel
          </a>
        </form>

        <p className="mt-4 text-sm text-gray-500">
          {payments.length} payment{payments.length === 1 ? "" : "s"} · Total{" "}
          <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
        </p>

        <div className="mt-3 max-h-80 overflow-x-auto overflow-y-auto rounded-md border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Member</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Method</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 text-gray-500">{formatDate(p.payment_date)}</td>
                  <td className="px-3 py-2 text-gray-900">
                    {(p.members as unknown as { full_name: string } | null)?.full_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 capitalize text-gray-500">{p.method.replace("_", " ")}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{formatCurrency(Number(p.amount))}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    No payments in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Membership roster</h2>
          <a
            href="/api/export/members"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Export to Excel
          </a>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-xl font-semibold text-gray-900">{statusCounts.active}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Expired</p>
            <p className="text-xl font-semibold text-gray-900">{statusCounts.expired}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Frozen</p>
            <p className="text-xl font-semibold text-gray-900">{statusCounts.frozen}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
