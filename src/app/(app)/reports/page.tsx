import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/buttonStyles";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Reports</h1>
        <p className="mt-1 text-sm text-body">Understand membership, revenue and gym performance.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-heading">Revenue</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-body">From</label>
            <input
              type="date"
              name="start"
              defaultValue={rangeStart}
              className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-body">To</label>
            <input
              type="date"
              name="end"
              defaultValue={rangeEnd}
              className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading focus:border-primary focus:outline-none"
            />
          </div>
          <button type="submit" className={buttonVariants.secondary}>
            Apply
          </button>
          <a href={`/api/export/revenue?${exportQuery}`} className={buttonVariants.primary}>
            Export to Excel
          </a>
        </form>

        <p className="mt-4 text-sm text-body">
          {payments.length} payment{payments.length === 1 ? "" : "s"} · Total{" "}
          <span className="font-semibold text-heading">{formatCurrency(totalRevenue)}</span>
        </p>

        <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-app-bg">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted">Date</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Member</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Method</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 text-body">{formatDate(p.payment_date)}</td>
                  <td className="px-3 py-2 text-heading">
                    {(p.members as unknown as { full_name: string } | null)?.full_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 capitalize text-body">{p.method.replace("_", " ")}</td>
                  <td className="px-3 py-2 font-medium text-heading">{formatCurrency(Number(p.amount))}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted">
                    No payments in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-heading">Membership roster</h2>
          <a href="/api/export/members" className={buttonVariants.secondary}>
            Export to Excel
          </a>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted">Active</p>
            <p className="text-xl font-bold text-heading">{statusCounts.active}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Expired</p>
            <p className="text-xl font-bold text-heading">{statusCounts.expired}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Frozen</p>
            <p className="text-xl font-bold text-heading">{statusCounts.frozen}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
