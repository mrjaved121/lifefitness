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
      <h1 className="text-2xl font-semibold text-gray-900">Add member</h1>
      <MemberForm plans={plans || []} />
    </div>
  );
}
