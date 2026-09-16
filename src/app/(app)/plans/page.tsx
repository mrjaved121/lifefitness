import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { PlansTable } from "./PlansTable";
import { PlanForm } from "./PlanForm";

export default async function PlansPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const owner = isOwner(profile);

  const { data: plans } = await supabase.from("plans").select("*").order("price", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Membership plans</h1>

      {owner && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Add plan</h2>
          <PlanForm />
        </div>
      )}

      <PlansTable plans={plans || []} isOwner={owner} />
    </div>
  );
}
