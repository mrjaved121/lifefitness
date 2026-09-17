"use client";

import { useActionState, useMemo, useState } from "react";
import { renewMembership, type ActionState } from "@/lib/actions/members";
import { SubmitButton } from "@/components/SubmitButton";
import type { Plan } from "@/types/database";

const initialState: ActionState = { error: null };
const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading focus:border-primary focus:outline-none";

export function RenewForm({ memberId, plans }: { memberId: string; plans: Plan[] }) {
  const [state, formAction] = useActionState(renewMembership, initialState);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="member_id" value={memberId} />
      {state.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}

      <div>
        <label className="block text-xs font-medium text-body">Plan</label>
        <select name="plan_id" value={planId} onChange={(e) => setPlanId(e.target.value)} required className={inputClass}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.duration_days}d
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-body">Amount charged</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={selectedPlan?.price ?? 0}
            key={selectedPlan?.id}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-body">Method</label>
          <select name="method" className={inputClass}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-body">Notes</label>
        <input name="notes" className={inputClass} />
      </div>

      <SubmitButton pendingText="Renewing..." className="w-full">
        Renew membership
      </SubmitButton>
    </form>
  );
}
