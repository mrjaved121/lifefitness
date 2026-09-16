"use client";

import { useActionState } from "react";
import { addPayment, type ActionState } from "@/lib/actions/payments";
import { SubmitButton } from "@/components/SubmitButton";
import { todayStr } from "@/lib/format";

const initialState: ActionState = { error: null };

export function PaymentForm({ memberId }: { memberId: string }) {
  const action = addPayment.bind(null, memberId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">Amount</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Date</label>
          <input
            name="payment_date"
            type="date"
            defaultValue={todayStr()}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
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

      <div>
        <label className="block text-xs font-medium text-gray-700">Notes</label>
        <input
          name="notes"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <SubmitButton pendingText="Adding..." className="w-full">
        Record payment
      </SubmitButton>
    </form>
  );
}
