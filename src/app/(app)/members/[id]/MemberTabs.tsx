"use client";

import { useState } from "react";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatCurrency, formatDate } from "@/lib/format";
import { deletePayment } from "@/lib/actions/payments";
import { RenewForm } from "./RenewForm";
import { PaymentForm } from "./PaymentForm";
import type { Payment, Plan, Member } from "@/types/database";

type Tab = "overview" | "membership" | "payments";

export function MemberTabs({
  member,
  planName,
  payments,
  activePlans,
  isOwner,
}: {
  member: Member;
  planName: string | null;
  payments: Pick<Payment, "id" | "amount" | "payment_date" | "method" | "notes">[];
  activePlans: Plan[];
  isOwner: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "membership", label: "Membership" },
    { id: "payments", label: "Payments" },
  ];

  return (
    <div>
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-body"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 pt-5 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-heading">Contact Information</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Phone</dt>
                <dd className="font-medium text-heading">{member.phone || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Email</dt>
                <dd className="font-medium text-heading">{member.email || "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-heading">Membership Summary</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Plan</dt>
                <dd className="font-medium text-heading">{planName ?? "No plan"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Join date</dt>
                <dd className="font-medium text-heading">{formatDate(member.start_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Total paid</dt>
                <dd className="font-medium text-heading">{formatCurrency(totalPaid)}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {tab === "membership" && (
        <div className="grid grid-cols-1 gap-6 pt-5 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-heading">Current membership</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Plan</dt>
                <dd className="font-medium text-heading">{planName ?? "No plan"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Start date</dt>
                <dd className="font-medium text-heading">{formatDate(member.start_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">End date</dt>
                <dd className="font-medium text-heading">{formatDate(member.end_date)}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-heading">Renew membership</h3>
            <div className="mt-3">
              {activePlans.length > 0 ? (
                <RenewForm memberId={member.id} plans={activePlans} />
              ) : (
                <p className="text-sm text-muted">No active plans available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className="grid grid-cols-1 gap-6 pt-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-heading">Payment history</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted">
                    <th className="py-2 pr-3">Date</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Notes</th>
                    {isOwner && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-3 text-body">{formatDate(p.payment_date)}</td>
                      <td className="px-3 py-2.5 font-medium text-heading">{formatCurrency(Number(p.amount))}</td>
                      <td className="px-3 py-2.5 capitalize text-body">{p.method.replace("_", " ")}</td>
                      <td className="px-3 py-2.5 text-body">{p.notes || "—"}</td>
                      {isOwner && (
                        <td className="px-3 py-2.5 text-right">
                          <form action={deletePayment.bind(null, p.id, member.id)}>
                            <ConfirmSubmit confirmText="Delete this payment record?">Delete</ConfirmSubmit>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={isOwner ? 5 : 4} className="py-6 text-center text-muted">
                        No payments recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-heading">Record payment</h3>
            <div className="mt-3">
              <PaymentForm memberId={member.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
