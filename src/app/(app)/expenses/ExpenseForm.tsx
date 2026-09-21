"use client";

import { useRef, useState, useTransition } from "react";
import { createExpense } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { buttonVariants } from "@/components/buttonStyles";

const inputClass =
  "mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-heading focus:border-primary focus:outline-none";

export function ExpenseForm({ defaultDate }: { defaultDate: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createExpense({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        // Keep the date (entering a run of expenses is usually one day's
        // worth); clear the rest.
        const date = formData.get("expense_date");
        formRef.current?.reset();
        const dateInput = formRef.current?.elements.namedItem("expense_date");
        if (dateInput instanceof HTMLInputElement && typeof date === "string") dateInput.value = date;
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && <p className="w-full rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div>
        <label htmlFor="expense-category" className="block text-xs font-medium text-body">
          Category
        </label>
        <select id="expense-category" name="category" required defaultValue="" className={`${inputClass} w-52`}>
          <option value="" disabled>
            Choose…
          </option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="expense-amount" className="block text-xs font-medium text-body">
          Amount
        </label>
        <input
          id="expense-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          required
          className={`${inputClass} w-32`}
        />
      </div>
      <div>
        <label htmlFor="expense-date" className="block text-xs font-medium text-body">
          Date
        </label>
        <input id="expense-date" name="expense_date" type="date" defaultValue={defaultDate} required className={`${inputClass} w-40`} />
      </div>
      <div className="min-w-48 flex-1">
        <label htmlFor="expense-notes" className="block text-xs font-medium text-body">
          Note (optional)
        </label>
        <input
          id="expense-notes"
          name="notes"
          maxLength={500}
          placeholder="e.g. September rent"
          className={`${inputClass} w-full`}
        />
      </div>
      <button type="submit" disabled={isPending} className={buttonVariants.primary}>
        {isPending ? "Saving..." : "Add expense"}
      </button>
    </form>
  );
}
