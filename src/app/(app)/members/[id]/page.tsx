import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { Avatar } from "@/components/Avatar";
import { formatCurrency, formatDate } from "@/lib/format";
import { deleteMember, toggleFreeze } from "@/lib/actions/members";
import { deletePayment } from "@/lib/actions/payments";
import { RenewForm } from "./RenewForm";
import { PaymentForm } from "./PaymentForm";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const owner = isOwner(profile);

  const [{ data: member }, { data: payments }, { data: plans }] = await Promise.all([
    supabase.from("members").select("*, plans(name, duration_days, price)").eq("id", id).single(),
    supabase
      .from("payments")
      .select("id, amount, payment_date, method, notes")
      .eq("member_id", id)
      .order("payment_date", { ascending: false }),
    supabase.from("plans").select("*").eq("is_active", true).order("price", { ascending: true }),
  ]);

  if (!member) notFound();

  const plan = member.plans as unknown as { name: string; duration_days: number; price: number } | null;
  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={member.photo_url} name={member.full_name} className="h-14 w-14 shrink-0 text-lg" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{member.full_name}</h1>
            <p className="text-sm text-gray-500">{plan?.name ?? "No plan"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={member.status} />
          <Link href={`/members/${id}/edit`} className="text-sm font-medium text-gray-700 hover:underline">
            Edit
          </Link>
          {member.status !== "expired" && (
            <form action={toggleFreeze.bind(null, id, member.status !== "frozen")}>
              <button type="submit" className="text-sm font-medium text-gray-700 hover:underline">
                {member.status === "frozen" ? "Unfreeze" : "Freeze"}
              </button>
            </form>
          )}
          {owner && (
            <form action={deleteMember.bind(null, id)}>
              <ConfirmSubmit confirmText={`Delete ${member.full_name}? This also deletes their payment history.`}>
                Delete
              </ConfirmSubmit>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Phone</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{member.phone || "—"}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Email</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{member.email || "—"}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Membership</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {formatDate(member.start_date)} – {formatDate(member.end_date)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total paid</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Payment history</h2>
          <div className="mt-3 overflow-x-auto rounded-md border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Method</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Notes</th>
                  {owner && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments?.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-gray-500">{formatDate(p.payment_date)}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{formatCurrency(Number(p.amount))}</td>
                    <td className="px-3 py-2 capitalize text-gray-500">{p.method.replace("_", " ")}</td>
                    <td className="px-3 py-2 text-gray-500">{p.notes || "—"}</td>
                    {owner && (
                      <td className="px-3 py-2 text-right">
                        <form action={deletePayment.bind(null, p.id, id)}>
                          <ConfirmSubmit confirmText="Delete this payment record?">Delete</ConfirmSubmit>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
                {(!payments || payments.length === 0) && (
                  <tr>
                    <td colSpan={owner ? 5 : 4} className="px-3 py-6 text-center text-gray-500">
                      No payments recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Record payment</h2>
            <div className="mt-3">
              <PaymentForm memberId={id} />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Renew membership</h2>
            <div className="mt-3">
              {plans && plans.length > 0 ? (
                <RenewForm memberId={id} plans={plans} />
              ) : (
                <p className="text-sm text-gray-500">No active plans available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
