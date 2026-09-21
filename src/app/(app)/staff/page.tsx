import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { StaffTable } from "./StaffTable";

export default async function StaffPage() {
  const profile = await getCurrentProfile();
  if (!isSuperAdmin(profile)) notFound();

  const supabase = await createClient();
  const { data: staff, error } = await supabase.rpc("list_staff");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Staff</h1>
        <p className="mt-1 text-sm text-body">
          Manage who has front desk, owner, or super admin access. New sign-ups show as Pending approval and can&apos;t
          see anything until you give them a role.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error.message}</p>
      ) : (
        <StaffTable staff={staff || []} currentUserId={profile!.id} />
      )}
    </div>
  );
}
