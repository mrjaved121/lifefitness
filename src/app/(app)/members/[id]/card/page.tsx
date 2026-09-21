import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/PrintButton";
import { MemberCard } from "@/components/MemberCard";

export default async function MemberCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, member_no, photo_url")
    .eq("id", id)
    .maybeSingle();
  if (!member) notFound();

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/members/${id}`} className="text-sm font-medium text-muted hover:text-body">
          ← Back to member
        </Link>
        <PrintButton>Print card</PrintButton>
      </div>

      <div className="flex justify-center">
        <MemberCard member={member} />
      </div>

      <p className="text-center text-xs text-muted print:hidden">
        Print on card stock, or print on paper and laminate. When it&apos;s scanned on the Check-in screen, the visit is recorded.
      </p>
    </div>
  );
}
