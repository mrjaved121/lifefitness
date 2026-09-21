import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/PrintButton";
import { formatCurrency, formatDate } from "@/lib/format";
import { methodLabel } from "@/lib/reports";
import { receiptNumber } from "@/lib/receipt";
import { GYM_NAME } from "@/lib/brand";

type ReceiptRow = {
  id: string;
  member_id: string;
  amount: number | string;
  payment_date: string;
  method: string;
  notes: string | null;
  members: { full_name: string; member_no: number | null; phone: string | null; plans: { name: string } | null } | null;
  profiles: { full_name: string | null } | null;
};

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("payments")
    .select("id, member_id, amount, payment_date, method, notes, members(full_name, member_no, phone, plans(name)), profiles(full_name)")
    .eq("id", id)
    .maybeSingle();

  const payment = data as unknown as ReceiptRow | null;
  if (!payment) notFound();

  const { data: balance } = await supabase
    .from("member_balances")
    .select("outstanding")
    .eq("member_id", payment.member_id)
    .maybeSingle();
  const outstanding = Number(balance?.outstanding ?? 0);

  const member = payment.members;
  const rows: { label: string; value: string }[] = [
    { label: "Received from", value: member?.full_name ?? "—" },
    ...(member?.member_no != null ? [{ label: "Member no.", value: `#${member.member_no}` }] : []),
    { label: "Plan", value: member?.plans?.name ?? "—" },
    { label: "Payment date", value: formatDate(payment.payment_date) },
    { label: "Method", value: methodLabel(payment.method) },
    ...(payment.notes ? [{ label: "Notes", value: payment.notes }] : []),
    ...(payment.profiles?.full_name ? [{ label: "Received by", value: payment.profiles.full_name }] : []),
  ];

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/members/${payment.member_id}`} className="text-sm font-medium text-muted hover:text-body">
          ← Back to member
        </Link>
        <PrintButton>Print receipt</PrintButton>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 print:rounded-none print:border-0 print:p-0">
        <div className="border-b border-border pb-4 text-center">
          <p className="text-xl font-bold text-heading">{GYM_NAME}</p>
          <p className="mt-1 text-xs tracking-wide text-muted uppercase">Payment receipt</p>
        </div>

        <div className="flex items-center justify-between py-4 text-sm">
          <span className="text-muted">Receipt no.</span>
          <span className="font-medium text-heading">{receiptNumber(payment.id)}</span>
        </div>

        <dl className="space-y-3 border-t border-border py-4 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-muted">{row.label}</dt>
              <dd className="text-right font-medium text-heading">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-semibold text-heading">Amount received</span>
          <span className="text-2xl font-bold text-heading">{formatCurrency(Number(payment.amount))}</span>
        </div>

        {outstanding > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Balance still due</span>
            <span className="font-semibold text-danger">{formatCurrency(outstanding)}</span>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted">Thank you for your payment.</p>
      </div>
    </div>
  );
}
