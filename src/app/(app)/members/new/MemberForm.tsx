"use client";

import { useActionState, useMemo, useState } from "react";
import { createMember, type ActionState } from "@/lib/actions/members";
import { SubmitButton } from "@/components/SubmitButton";
import { addDays, formatDate, todayStr } from "@/lib/format";
import type { Plan } from "@/types/database";

const initialState: ActionState = { error: null };
const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-heading focus:border-primary focus:outline-none";

export function MemberForm({ plans }: { plans: Plan[] }) {
  const [state, formAction] = useActionState(createMember, initialState);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [startDate, setStartDate] = useState(todayStr());

  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);
  const previewEndDate = selectedPlan ? addDays(startDate, selectedPlan.duration_days) : null;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-heading">Personal Information</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-body">Photo (optional)</label>
            <input
              name="photo"
              type="file"
              accept="image/*"
              className="mt-1 w-full text-sm text-body file:mr-3 file:rounded-lg file:border-0 file:bg-app-bg file:px-3 file:py-2 file:text-sm file:font-medium file:text-heading hover:file:bg-border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-body">Full name</label>
            <input name="full_name" required className={inputClass} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-body">Phone</label>
              <input name="phone" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-body">Email</label>
              <input name="email" type="email" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-body">Address</label>
            <input name="address" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-body">Notes (optional)</label>
            <textarea name="notes" rows={2} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-heading">Membership</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-body">Plan</label>
            <select name="plan_id" value={planId} onChange={(e) => setPlanId(e.target.value)} required className={inputClass}>
              {plans.length === 0 && <option value="">No active plans — add one first</option>}
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.duration_days} days
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-body">Start date</label>
            <input
              name="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className={inputClass}
            />
            {previewEndDate && (
              <p className="mt-1 text-xs text-muted">Membership will run through {formatDate(previewEndDate)}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <SubmitButton pendingText="Adding...">Create Member</SubmitButton>
      </div>
    </form>
  );
}
