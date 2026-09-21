import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { PillLink } from "../../reports/ReportParts";
import { INACTIVE_DAY_OPTIONS, DEFAULT_INACTIVE_DAYS, inactiveFilter, lastVisitLabel, resolveInactiveDays } from "@/lib/activity";
import { formatDate, todayStr, whatsAppMissYouLink } from "@/lib/format";
import { withMigrationHint } from "@/lib/migrations";
import { paginate, parsePage } from "@/lib/pagination";
import type { MemberActivity } from "@/types/database";

const PAGE_SIZE = 30;

type Row = Pick<
  MemberActivity,
  "member_id" | "member_no" | "full_name" | "phone" | "photo_url" | "end_date" | "plan_name" | "last_visit" | "total_visits"
>;

export default async function InactiveMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; page?: string }>;
}) {
  const { days: daysParam, page: pageParam } = await searchParams;
  const days = resolveInactiveDays(daysParam);
  const today = todayStr();
  const filter = inactiveFilter(days, today);
  const supabase = await createClient();

  // Same two-query shape as the Members page: a head-only count first, so the
  // page range for the data query always comes from a real total.
  const { count, error: countError } = await supabase
    .from("member_activity")
    .select("member_id", { count: "exact", head: true })
    .eq("status", "active")
    .gte("end_date", today)
    .or(filter);
  const pageInfo = paginate(parsePage(pageParam), PAGE_SIZE, count ?? 0);

  const { data, error: dataError } = countError
    ? { data: null, error: countError }
    : await supabase
        .from("member_activity")
        .select("member_id, member_no, full_name, phone, photo_url, end_date, plan_name, last_visit, total_visits")
        .eq("status", "active")
        .gte("end_date", today)
        .or(filter)
        // People who used to come and stopped first; "never checked in" last.
        .order("last_visit", { ascending: true, nullsFirst: false })
        .order("full_name")
        .order("member_id")
        .range(pageInfo.from, pageInfo.to);
  const rows = (data ?? []) as Row[];
  const error = countError || dataError;

  function href(nextDays: number, nextPage = 1) {
    const params = new URLSearchParams();
    if (nextDays !== DEFAULT_INACTIVE_DAYS) params.set("days", String(nextDays));
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/members/inactive?${qs}` : "/members/inactive";
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/members" className="text-sm font-medium text-muted hover:text-body">
          ← Members
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-heading">Stopped coming</h1>
        <p className="mt-1 text-sm text-body">
          Active members who haven&apos;t checked in for {days} or more days. A quick message often brings them back.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {INACTIVE_DAY_OPTIONS.map((option) => (
            <PillLink key={option} href={href(option)} active={option === days}>
              {option}+ days
            </PillLink>
          ))}
        </div>
        <p className="text-sm text-muted">
          {(count ?? 0).toLocaleString()} member{count === 1 ? "" : "s"}
        </p>
      </div>

      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{withMigrationHint(error.message)}</p>}

      {!error && rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-sm font-medium text-heading">Nobody has been away that long</p>
          <p className="mt-1 text-sm text-muted">Every active member has checked in within the last {days} days.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {rows.map((m) => (
              <li key={m.member_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <Link href={`/members/${m.member_id}`} className="flex min-w-0 items-center gap-3 hover:text-primary">
                  <Avatar src={m.photo_url} name={m.full_name} className="h-9 w-9 shrink-0 text-xs" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-heading">{m.full_name}</span>
                    <span className="block truncate text-xs text-muted">
                      {[m.member_no != null && `#${m.member_no}`, m.plan_name ?? "No plan"].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-right">
                    <span className="block font-medium text-heading">{lastVisitLabel(m.last_visit)}</span>
                    <span className="block text-xs text-muted">
                      {m.last_visit ? formatDate(m.last_visit) : "No visits recorded"} · {Number(m.total_visits).toLocaleString()} total
                    </span>
                  </span>
                  {m.phone ? (
                    <a
                      href={whatsAppMissYouLink(m.phone, m.full_name, m.last_visit)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-app-bg"
                    >
                      WhatsApp
                    </a>
                  ) : (
                    <span className="w-[4.5rem] text-center text-xs text-muted">No phone</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted">
        Based on check-ins recorded in this app. A member who has never checked in is listed last, and only once they joined at
        least {days} days ago.
      </p>

      {pageInfo.totalPages > 1 && (
        <nav aria-label="Stopped coming pages" className="flex items-center justify-between gap-3 pt-1">
          {pageInfo.hasPrev ? (
            <Link href={href(days, pageInfo.page - 1)} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-heading hover:bg-app-bg">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted">
            Page {pageInfo.page} of {pageInfo.totalPages}
          </p>
          {pageInfo.hasNext ? (
            <Link href={href(days, pageInfo.page + 1)} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-heading hover:bg-app-bg">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
