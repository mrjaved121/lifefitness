"use client";

import { useActionState } from "react";
import { addPayment, type ActionState } from "@/lib/actions/payments";
import { SubmitButton } from "@/components/SubmitButton";
import { todayStr } from "@/lib/format";

const initialState: ActionState = { error: null };
const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading focus:border-primary focus:outline-none";

export function PaymentForm({ memberId }: { memberId: string }) {
  const action = addPayment.bind(null, memberId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-body">Amount</label>
          <input name="amount" type="number" step="0.01" min="0.01" required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-body">Date</label>
          <input name="payment_date" type="date" defaultValue={todayStr()} required className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-body">Method</label>
        <select name="method" className={inputClass}>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-body">Notes</label>
        <input name="notes" className={inputClass} />
      </div>

      <SubmitButton pendingText="Adding..." className="w-full">
        Record payment
      </SubmitButton>
    </form>
  );
}
