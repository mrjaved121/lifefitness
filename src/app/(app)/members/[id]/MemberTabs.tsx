"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatCurrency, formatDate, monthStart } from "@/lib/format";
import { summarizeAttendance } from "@/lib/attendance";
import { deletePayment } from "@/lib/actions/payments";
import { deleteCheckIn } from "@/lib/actions/checkins";
import { RenewForm } from "./RenewForm";
import { PaymentForm } from "./PaymentForm";
import type { CheckIn, Payment, Plan, Member } from "@/types/database";

type Tab = "overview" | "membership" | "payments" | "attendance";

export function MemberTabs({
  member,
  planName,
  payments,
  activePlans,
  checkIns,
  outstanding,
  isOwner,
}: {
  member: Member;
  planName: string | null;
  payments: Pick<Payment, "id" | "amount" | "payment_date" | "method" | "notes">[];
  activePlans: Plan[];
  checkIns: Pick<CheckIn, "id" | "check_in_date">[];
  outstanding: number;
  isOwner: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const attendance = summarizeAttendance(
    checkIns.map((c) => c.check_in_date),
    monthStart(0)
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "membership", label: "Membership" },
    { id: "payments", label: "Payments" },
    { id: "attendance", label: "Attendance" },
  ];

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
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
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Address</dt>
                <dd className="text-right font-medium text-heading">{member.address || "—"}</dd>
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
              <div className="flex justify-between">
                <dt className="text-muted">Outstanding balance</dt>
                <dd className={`font-medium ${outstanding > 0 ? "text-danger" : "text-heading"}`}>
                  {outstanding > 0 ? formatCurrency(outstanding) : "Paid in full"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Last visit</dt>
                <dd className="font-medium text-heading">{attendance.lastVisit ? formatDate(attendance.lastVisit) : "Never"}</dd>
              </div>
            </dl>
          </div>
          {member.notes && (
            <div className="rounded-xl border border-border bg-surface p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-heading">Notes</h3>
              <p className="mt-3 whitespace-pre-line text-sm text-body">{member.notes}</p>
            </div>
          )}
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
                    <th className="px-3 py-2" />
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
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/receipts/${p.id}`} className="text-sm font-medium text-primary hover:text-primary-hover">
                          Receipt
                        </Link>
                      </td>
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
                      <td colSpan={isOwner ? 6 : 5} className="py-6 text-center text-muted">
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

      {tab === "attendance" && (
        <div className="space-y-6 pt-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted">Total visits</p>
              <p className="mt-1 text-xl font-bold text-heading">{attendance.totalVisits.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted">This month</p>
              <p className="mt-1 text-xl font-bold text-heading">{attendance.thisMonthVisits.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted">Last visit</p>
              <p className="mt-1 text-xl font-bold text-heading">{attendance.lastVisit ? formatDate(attendance.lastVisit) : "Never"}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-heading">Recent visits</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted">
                    <th className="py-2 pr-3">Date</th>
                    {isOwner && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {checkIns.slice(0, 30).map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 pr-3 text-body">{formatDate(c.check_in_date)}</td>
                      {isOwner && (
                        <td className="px-3 py-2.5 text-right">
                          <form action={deleteCheckIn.bind(null, c.id, member.id)}>
                            <ConfirmSubmit confirmText="Remove this visit record?">Delete</ConfirmSubmit>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                  {checkIns.length === 0 && (
                    <tr>
                      <td colSpan={isOwner ? 2 : 1} className="py-6 text-center text-muted">
                        No visits recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {checkIns.length > 30 && <p className="mt-3 text-xs text-muted">Showing the 30 most recent visits.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
