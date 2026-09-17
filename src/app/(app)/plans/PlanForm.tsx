"use client";

import { useRef, useState, useTransition } from "react";
import { createPlan, updatePlan } from "@/lib/actions/plans";
import { buttonVariants } from "@/components/buttonStyles";
import type { Plan } from "@/types/database";

const inputClass =
  "mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading focus:border-primary focus:outline-none";

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
      {error && <p className="w-full rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-body">Name</label>
        <input name="name" defaultValue={plan?.name} required className={`${inputClass} w-40`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-body">Description (optional)</label>
        <input
          name="description"
          defaultValue={plan?.description ?? ""}
          placeholder="e.g. Full gym access"
          className={`${inputClass} w-56`}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-body">Duration (days)</label>
        <input
          name="duration_days"
          type="number"
          min="1"
          defaultValue={plan?.duration_days}
          required
          className={`${inputClass} w-32`}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-body">Price</label>
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={plan?.price}
          required
          className={`${inputClass} w-28`}
        />
      </div>
      <button type="submit" disabled={isPending} className={buttonVariants.primary}>
        {isPending ? "Saving..." : plan ? "Save" : "Add plan"}
      </button>
      {plan && (
        <button type="button" onClick={onDone} className="text-sm font-medium text-muted hover:text-body">
          Cancel
        </button>
      )}
    </form>
  );
}
