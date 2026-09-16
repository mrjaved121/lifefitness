"use client";

import { useState } from "react";
import { togglePlanActive, deletePlan } from "@/lib/actions/plans";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatCurrency } from "@/lib/format";
import type { Plan } from "@/types/database";
import { PlanForm } from "./PlanForm";

export function PlansTable({ plans, isOwner }: { plans: Plan[]; isOwner: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Duration</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Price</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            {isOwner && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {plans.map((plan) =>
            editingId === plan.id ? (
              <tr key={plan.id}>
                <td colSpan={isOwner ? 5 : 4} className="px-4 py-3">
                  <PlanForm plan={plan} onDone={() => setEditingId(null)} />
                </td>
              </tr>
            ) : (
              <tr key={plan.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{plan.name}</td>
                <td className="px-4 py-3 text-gray-500">{plan.duration_days} days</td>
                <td className="px-4 py-3 text-gray-500">{formatCurrency(Number(plan.price))}</td>
                <td className="px-4 py-3 text-gray-500">{plan.is_active ? "Active" : "Inactive"}</td>
                {isOwner && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingId(plan.id)}
                        className="text-sm font-medium text-gray-700 hover:underline"
                      >
                        Edit
                      </button>
                      <form action={togglePlanActive.bind(null, plan.id, !plan.is_active)}>
                        <button type="submit" className="text-sm font-medium text-gray-700 hover:underline">
                          {plan.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <form action={deletePlan.bind(null, plan.id)}>
                        <ConfirmSubmit confirmText={`Delete plan "${plan.name}"? Existing members keep their dates but lose the plan link.`}>
                          Delete
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            )
          )}
          {plans.length === 0 && (
            <tr>
              <td colSpan={isOwner ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                No plans yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
