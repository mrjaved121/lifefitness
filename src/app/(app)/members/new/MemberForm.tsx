"use client";

import { useActionState, useMemo, useState } from "react";
import { createMember, type ActionState } from "@/lib/actions/members";
import { SubmitButton } from "@/components/SubmitButton";
import { addDays, formatDate, todayStr } from "@/lib/format";
import type { Plan } from "@/types/database";

const initialState: ActionState = { error: null };

export function MemberForm({ plans }: { plans: Plan[] }) {
  const [state, formAction] = useActionState(createMember, initialState);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [startDate, setStartDate] = useState(todayStr());

  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);
  const previewEndDate = selectedPlan ? addDays(startDate, selectedPlan.duration_days) : null;

  return (
    <form action={formAction} className="max-w-lg space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700">Full name</label>
        <input
          name="full_name"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            name="phone"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Plan</label>
        <select
          name="plan_id"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          {plans.length === 0 && <option value="">No active plans — add one first</option>}
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.duration_days} days
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Start date</label>
        <input
          name="start_date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        {previewEndDate && (
          <p className="mt-1 text-xs text-gray-500">Membership will run through {formatDate(previewEndDate)}</p>
        )}
      </div>

      <SubmitButton pendingText="Adding...">Add member</SubmitButton>
    </form>
  );
}
