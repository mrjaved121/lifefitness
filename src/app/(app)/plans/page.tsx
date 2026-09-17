import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { PlansGrid } from "./PlansGrid";
import { PlanForm } from "./PlanForm";

export default async function PlansPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const owner = isOwner(profile);

  const [{ data: plans }, { data: memberPlans }] = await Promise.all([
    supabase.from("plans").select("*").order("price", { ascending: true }),
    supabase.from("members").select("plan_id").not("plan_id", "is", null),
  ]);

  const memberCounts: Record<string, number> = {};
  for (const m of memberPlans || []) {
    if (m.plan_id) memberCounts[m.plan_id] = (memberCounts[m.plan_id] || 0) + 1;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Membership Plans</h1>
          <p className="mt-1 text-sm text-body">Create and manage gym membership plans.</p>
        </div>
      </div>

      {owner && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-heading">Create Plan</h2>
          <PlanForm />
        </div>
      )}

      <PlansGrid plans={plans || []} isOwner={owner} memberCounts={memberCounts} />
    </div>
  );
}
