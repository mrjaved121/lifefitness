"use client";

import { useState } from "react";
import { togglePlanActive, deletePlan } from "@/lib/actions/plans";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { buttonVariants } from "@/components/buttonStyles";
import { formatCurrency } from "@/lib/format";
import type { Plan } from "@/types/database";
import { PlanForm } from "./PlanForm";

export function PlansGrid({
  plans,
  isOwner,
  memberCounts,
}: {
  plans: Plan[];
  isOwner: boolean;
  memberCounts: Record<string, number>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-12 text-center">
        <p className="text-sm font-medium text-heading">No plans yet</p>
        <p className="mt-1 text-sm text-muted">Create your first membership plan to start enrolling members.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        if (editingId === plan.id) {
          return (
            <div key={plan.id} className="rounded-xl border border-border bg-surface p-5 sm:col-span-2 lg:col-span-3">
              <PlanForm plan={plan} onDone={() => setEditingId(null)} />
            </div>
          );
        }

        const features = (plan.description || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const count = memberCounts[plan.id] || 0;

        return (
          <div
            key={plan.id}
            className={`flex flex-col rounded-xl border border-border bg-surface p-5 ${plan.is_active ? "" : "opacity-60"}`}
          >
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{plan.name}</p>
            <p className="mt-2 text-2xl font-bold text-heading">{formatCurrency(Number(plan.price))}</p>
            <p className="text-xs text-muted">per {plan.duration_days} days</p>

            {features.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm text-body">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-success">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex-1" />

            <p className="mt-4 text-xs text-muted">
              {count} member{count === 1 ? "" : "s"}
              {!plan.is_active && " · Inactive"}
            </p>

            {isOwner && (
              <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setEditingId(plan.id)}
                  className={buttonVariants.tertiary}
                >
                  Edit
                </button>
                <form action={togglePlanActive.bind(null, plan.id, !plan.is_active)}>
                  <button type="submit" className="text-sm font-medium text-body hover:text-heading">
                    {plan.is_active ? "Deactivate" : "Activate"}
                  </button>
                </form>
                <form action={deletePlan.bind(null, plan.id)} className="ml-auto">
                  <ConfirmSubmit confirmText={`Delete plan "${plan.name}"? Existing members keep their dates but lose the plan link.`}>
                    Delete
                  </ConfirmSubmit>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
