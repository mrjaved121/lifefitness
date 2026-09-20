import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { LinkButton } from "@/components/LinkButton";
import { CheckInButton } from "@/components/CheckInButton";
import { formatDate, todayStr, addDays } from "@/lib/format";
import { parsePage, paginate } from "@/lib/pagination";

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
];

const PAGE_SIZE = 30;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageParam } = await searchParams;
  const supabase = await createClient();

  // A plain select() is capped at 1,000 rows by Supabase with no error, so a
  // gym past that member count would silently see a wrong list.
  //
  // The search/status filter is computed once as a plain PostgREST filter
  // string, then applied separately to two DIFFERENT queries - a head:true
  // count-only request, and the real paginated data request - rather than
  // through a shared generic helper, which sends Supabase's builder types
  // (already deeply generic) into a TypeScript "instantiation too deep" error.
  //
  // Using two queries (instead of one range() request with count attached)
  // is required, not just convenient: a .range() past the actual result
  // count makes PostgREST respond 416 (confirmed directly against the API),
  // not 200-with-empty-data, so the data query's range must always be
  // computed from a real prior count. head:true never sends a Range header
  // at all, so it can't hit that 416.
  let searchFilter: string | null = null;
  if (q) {
    // PostgREST's `.or()` treats `,()"` as structural, so quote the value
    // (escaping embedded quotes) to search safely for terms like "Smith, Jr".
    const term = `%${q}%`.replace(/"/g, '\\"');
    const filters = [
      `full_name.ilike."${term}"`,
      `phone.ilike."${term}"`,
      `email.ilike."${term}"`,
      `address.ilike."${term}"`,
    ];
    // Register numbers are short; a longer digit string is a phone number and
    // would overflow the integer column.
    const digits = q.trim();
    if (/^\d{1,6}$/.test(digits)) filters.push(`member_no.eq.${digits}`);
    searchFilter = filters.join(",");
  }
  const expiringBy = addDays(todayStr(), 7);

  let countQuery = supabase.from("members").select("id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("members")
    .select("id, member_no, full_name, phone, email, address, photo_url, end_date, status, plans(name)")
    .order("full_name", { ascending: true })
    .order("id");
  if (searchFilter) {
    countQuery = countQuery.or(searchFilter);
    dataQuery = dataQuery.or(searchFilter);
  }
  if (status === "expiring") {
    countQuery = countQuery.eq("status", "active").lte("end_date", expiringBy);
    dataQuery = dataQuery.eq("status", "active").lte("end_date", expiringBy);
  } else if (status) {
    countQuery = countQuery.eq("status", status);
    dataQuery = dataQuery.eq("status", status);
  }

  const requestedPage = parsePage(pageParam);
  const { count, error: countError } = await countQuery;
  const pageInfo = paginate(requestedPage, PAGE_SIZE, count ?? 0);

  const { data: members, error: dataError } = countError
    ? { data: null, error: countError }
    : await dataQuery.range(pageInfo.from, pageInfo.to);
  const error = countError || dataError;

  const today = todayStr();
  const memberIds = (members ?? []).map((m) => m.id);
  const { data: todaysCheckIns } =
    memberIds.length > 0
      ? await supabase.from("check_ins").select("member_id").eq("check_in_date", today).in("member_id", memberIds)
      : { data: [] as { member_id: string }[] };
  const checkedInToday = new Set((todaysCheckIns ?? []).map((c) => c.member_id));

  // Both fields are required (no partial-merge defaults): a link that means
  // to clear the status filter needs to pass status: undefined explicitly,
  // which a `next.status ?? status` fallback couldn't tell apart from "unspecified".
  function href({ status: nextStatus, page: nextPage }: { status: string | undefined; page: number }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextStatus) params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/members?${qs}` : "/members";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Members</h1>
          <p className="mt-1 text-sm text-body">Manage memberships, plans and member information.</p>
        </div>
        <LinkButton href="/members/new">+ Add Member</LinkButton>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search members..."
          className="w-full min-w-0 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:border-primary focus:outline-none sm:w-72"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button
          type="submit"
          className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-heading hover:bg-app-bg sm:w-auto"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = (status || "") === f.value;
            return (
              <Link
                key={f.value}
                href={href({ status: f.value || undefined, page: 1 })}
                aria-current={active ? "true" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-primary text-white" : "border border-border bg-surface text-body hover:bg-app-bg"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <p className="text-sm text-muted">
          {pageInfo.rangeStart === pageInfo.rangeEnd
            ? `${pageInfo.rangeStart} of ${(count ?? 0).toLocaleString()} member${count === 1 ? "" : "s"}`
            : `${pageInfo.rangeStart}–${pageInfo.rangeEnd} of ${(count ?? 0).toLocaleString()} members`}
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error.message}</p>}

      {members && members.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-sm font-medium text-heading">No members found</p>
          <p className="mt-1 text-sm text-muted">
            {q || status ? "Try a different search or filter." : "Add your first member to start managing your gym."}
          </p>
          {!q && !status && (
            <div className="mt-4">
              <LinkButton href="/members/new">+ Add Member</LinkButton>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-app-bg">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted">Member</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Expires</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members?.map((m) => (
                  <tr key={m.id} className="hover:bg-app-bg">
                    <td className="px-4 py-3">
                      <Link href={`/members/${m.id}`} className="flex items-center gap-3 hover:text-primary">
                        <Avatar src={m.photo_url} name={m.full_name} className="h-9 w-9 shrink-0 text-xs" />
                        <span>
                          <span className="block font-medium text-heading">{m.full_name}</span>
                          <span className="block text-xs text-muted">
                            {[m.member_no != null && `#${m.member_no}`, m.address].filter(Boolean).join(" · ") || " "}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-body">{m.phone || m.email || "—"}</td>
                    <td className="px-4 py-3 text-body">{(m.plans as unknown as { name: string } | null)?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-body">{formatDate(m.end_date)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} endDate={m.end_date} />
                    </td>
                    <td className="px-4 py-3">
                      <CheckInButton memberId={m.id} checkedIn={checkedInToday.has(m.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards. The check-in button is a sibling of the Link, not
              nested inside it - a <form> inside an <a> is invalid HTML and
              would fight the anchor for the click. */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {members?.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-surface p-4">
                <Link href={`/members/${m.id}`} className="flex items-center gap-3 active:opacity-70">
                  <Avatar src={m.photo_url} name={m.full_name} className="h-10 w-10 shrink-0 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-heading">{m.full_name}</p>
                    <p className="truncate text-sm text-muted">
                      {[(m.plans as unknown as { name: string } | null)?.name ?? "No plan", m.member_no != null && `#${m.member_no}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <StatusBadge status={m.status} endDate={m.end_date} />
                </Link>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted">Expires {formatDate(m.end_date)}</span>
                  <CheckInButton memberId={m.id} checkedIn={checkedInToday.has(m.id)} />
                </div>
              </div>
            ))}
          </div>

          {pageInfo.totalPages > 1 && (
            <nav aria-label="Members pages" className="flex items-center justify-between gap-3 pt-1">
              {pageInfo.hasPrev ? (
                <Link href={href({ status, page: pageInfo.page - 1 })} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-heading hover:bg-app-bg">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <p className="text-sm text-muted">
                Page {pageInfo.page} of {pageInfo.totalPages}
              </p>
              {pageInfo.hasNext ? (
                <Link href={href({ status, page: pageInfo.page + 1 })} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-heading hover:bg-app-bg">
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
