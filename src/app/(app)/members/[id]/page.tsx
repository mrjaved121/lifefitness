import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { Avatar } from "@/components/Avatar";
import { CheckInButton } from "@/components/CheckInButton";
import { buttonVariants } from "@/components/buttonStyles";
import {
  daysUntil,
  emailDuesLink,
  emailReminderLink,
  formatCurrency,
  formatDate,
  todayStr,
  whatsAppDuesLink,
  whatsAppReminderLink,
} from "@/lib/format";
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

  const [{ data: member }, { data: payments }, { data: plans }, { data: checkIns }, { data: balance }] = await Promise.all([
    supabase.from("members").select("*, plans(name, duration_days, price)").eq("id", id).single(),
    supabase
      .from("payments")
      .select("id, amount, payment_date, method, notes")
      .eq("member_id", id)
      .order("payment_date", { ascending: false }),
    supabase.from("plans").select("*").eq("is_active", true).order("price", { ascending: true }),
    supabase.from("check_ins").select("id, check_in_date").eq("member_id", id).order("check_in_date", { ascending: false }),
    supabase.from("member_balances").select("outstanding").eq("member_id", id).maybeSingle(),
  ]);

  if (!member) notFound();

  const plan = member.plans as unknown as { name: string; duration_days: number; price: number } | null;
  const days = daysUntil(member.end_date);
  const banner = BANNER[member.status];
  const checkedInToday = (checkIns ?? []).some((c) => c.check_in_date === todayStr());
  const outstanding = Number(balance?.outstanding ?? 0);

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
          <CheckInButton memberId={id} checkedIn={checkedInToday} />
          <Link href={`/members/${id}/card`} className={buttonVariants.secondary}>
            Print card
          </Link>
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
        {/* A renewal reminder button, not just the outstanding-balance one below:
            once status flips to 'expired' the dashboard's 7-day reminder list no
            longer shows this member (it only lists active members), so without
            this row an expired member had no WhatsApp/email reminder anywhere.
            Shown for expired members and for active ones expiring within a week;
            an active member with months left doesn't need a renewal nudge. */}
        {(member.status === "expired" || (member.status === "active" && days <= 7)) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {member.phone ? (
              <a
                href={whatsAppReminderLink(member.phone, member.full_name, member.end_date)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-success hover:underline"
              >
                Remind on WhatsApp
              </a>
            ) : (
              !member.email && <span className="text-muted">Add a phone number or email to send a renewal reminder.</span>
            )}
            {member.email && (
              <a href={emailReminderLink(member.email, member.full_name, member.end_date)} className="font-medium text-info hover:underline">
                Remind by email
              </a>
            )}
          </div>
        )}
        {outstanding > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <p className="font-semibold text-danger">Outstanding: {formatCurrency(outstanding)}</p>
            {member.phone && (
              <a
                href={whatsAppDuesLink(member.phone, member.full_name, outstanding)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-success hover:underline"
              >
                Remind on WhatsApp
              </a>
            )}
            {member.email && (
              <a href={emailDuesLink(member.email, member.full_name, outstanding)} className="font-medium text-info hover:underline">
                Remind by email
              </a>
            )}
          </div>
        )}
      </div>

      <MemberTabs
        member={member}
        planName={plan?.name ?? null}
        payments={payments || []}
        activePlans={plans || []}
        checkIns={checkIns || []}
        outstanding={outstanding}
        isOwner={owner}
      />
    </div>
  );
}
