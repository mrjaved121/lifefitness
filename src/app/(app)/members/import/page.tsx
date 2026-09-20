import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "./ImportWizard";

export default async function ImportMembersPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("name").eq("is_active", true).order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Import Members</h1>
        <p className="mt-1 text-sm text-body">Add many members at once from an Excel or CSV file.</p>
      </div>
      <ImportWizard planNames={(plans || []).map((p) => p.name)} />
    </div>
  );
}
