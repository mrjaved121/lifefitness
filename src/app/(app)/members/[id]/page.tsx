import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { Avatar } from "@/components/Avatar";
import { buttonVariants } from "@/components/buttonStyles";
import { daysUntil, formatDate } from "@/lib/format";
import { deleteMember, toggleFreeze } from "@/lib/actions/members";
import { MemberTabs } from "./MemberTabs";

const BANNER: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-success/10", text: "text-success", label: "Membership Active" },
  frozen: { bg: "bg-info/10", text: "text-info", label: "Membership Frozen" },
  expired: { bg: "bg-danger/10", text: "text-danger", label: "Membership Expired" },
};

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const owner = isOwner(profile);

  const [{ data: member }, { data: payments }, { data: plans }] = await Promise.all([
    supabase.from("members").select("*, plans(name, duration_days, price)").eq("id", id).single(),
    supabase
      .from("payments")
      .select("id, amount, payment_date, method, notes")
      .eq("member_id", id)
      .order("payment_date", { ascending: false }),
    supabase.from("plans").select("*").eq("is_active", true).order("price", { ascending: true }),
  ]);

  if (!member) notFound();

  const plan = member.plans as unknown as { name: string; duration_days: number; price: number } | null;
  const days = daysUntil(member.end_date);
  const banner = BANNER[member.status];

  return (
    <div className="space-y-6">
      <Link href="/members" className="text-sm font-medium text-muted hover:text-body">
        ← Members
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar src={member.photo_url} name={member.full_name} className="h-14 w-14 shrink-0 text-lg" />
          <div>
            <h1 className="text-2xl font-bold text-heading">{member.full_name}</h1>
            <p className="text-sm text-body">
              {plan?.name ?? "No plan"}
              {member.member_no != null && ` · Member #${member.member_no}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/members/${id}/edit`} className={buttonVariants.secondary}>
            Edit Member
          </Link>
          {member.status !== "expired" && (
            <form action={toggleFreeze.bind(null, id, member.status !== "frozen")}>
              <button type="submit" className={buttonVariants.tertiary}>
                {member.status === "frozen" ? "Unfreeze" : "Freeze"}
              </button>
            </form>
          )}
          {owner && (
            <form action={deleteMember.bind(null, id)}>
              <ConfirmSubmit confirmText={`Delete ${member.full_name}? This also deletes their payment history.`}>
                Delete
              </ConfirmSubmit>
            </form>
          )}
        </div>
      </div>

      <div className={`rounded-xl p-4 ${banner.bg}`}>
        <p className={`text-sm font-semibold ${banner.text}`}>{banner.label}</p>
        <p className="mt-1 text-sm text-body">
          {plan?.name ?? "No plan"} · Expires {formatDate(member.end_date)}
        </p>
        {member.status === "active" && (
          <p className="mt-1 text-xs text-muted">
            {days === 0 ? "Expires today" : days > 0 ? `${days} days remaining` : `Expired ${Math.abs(days)} days ago`}
          </p>
        )}
      </div>

      <MemberTabs
        member={member}
        planName={plan?.name ?? null}
        payments={payments || []}
        activePlans={plans || []}
        isOwner={owner}
      />
    </div>
  );
}
