import { createClient } from "@/lib/supabase/server";
import { MemberForm } from "./MemberForm";

export default async function NewMemberPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Add Member</h1>
        <p className="mt-1 text-sm text-body">Enroll a new member and start their membership.</p>
      </div>
      <MemberForm plans={plans || []} />
    </div>
  );
}
