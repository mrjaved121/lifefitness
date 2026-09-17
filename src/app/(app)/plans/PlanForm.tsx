"use client";

import { useRef, useState, useTransition } from "react";
import { createPlan, updatePlan } from "@/lib/actions/plans";
import type { Plan } from "@/types/database";

export function PlanForm({ plan, onDone }: { plan?: Plan; onDone?: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const action = plan ? updatePlan.bind(null, plan.id) : createPlan;
      const result = await action({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        formRef.current?.reset();
        onDone?.();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && <p className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-gray-700">Name</label>
        <input
          name="name"
          defaultValue={plan?.name}
          required
          className="mt-1 w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700">Description (optional)</label>
        <input
          name="description"
          defaultValue={plan?.description ?? ""}
          placeholder="e.g. Includes cardio zone access"
          className="mt-1 w-56 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700">Duration (days)</label>
        <input
          name="duration_days"
          type="number"
          min="1"
          defaultValue={plan?.duration_days}
          required
          className="mt-1 w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700">Price</label>
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={plan?.price}
          required
          className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : plan ? "Save" : "Add plan"}
      </button>
      {plan && (
        <button type="button" onClick={onDone} className="text-sm font-medium text-gray-500 hover:underline">
          Cancel
        </button>
      )}
    </form>
  );
}
