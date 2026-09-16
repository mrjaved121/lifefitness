"use client";

import { useActionState, useMemo, useState } from "react";
import { renewMembership, type ActionState } from "@/lib/actions/members";
import { SubmitButton } from "@/components/SubmitButton";
import type { Plan } from "@/types/database";

const initialState: ActionState = { error: null };

export function RenewForm({ memberId, plans }: { memberId: string; plans: Plan[] }) {
  const [state, formAction] = useActionState(renewMembership, initialState);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="member_id" value={memberId} />
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div>
        <label className="block text-xs font-medium text-gray-700">Plan</label>
        <select
          name="plan_id"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.duration_days}d
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">Amount charged</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={selectedPlan?.price ?? 0}
            key={selectedPlan?.id}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Method</label>
          <select
            name="method"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Notes</label>
        <input
          name="notes"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <SubmitButton pendingText="Renewing..." className="w-full">
        Renew membership
      </SubmitButton>
    </form>
  );
}
