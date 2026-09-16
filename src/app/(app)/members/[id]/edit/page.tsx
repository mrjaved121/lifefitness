import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditMemberForm } from "./EditMemberForm";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: member } = await supabase.from("members").select("*").eq("id", id).single();

  if (!member) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Edit {member.full_name}</h1>
      <EditMemberForm member={member} />
    </div>
  );
}
