import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/PrintButton";
import { MemberCard } from "@/components/MemberCard";
import { parsePage, paginate } from "@/lib/pagination";

// Cards per screen. Printing prints what's on screen, so this is also the
// batch size: 40 is five A4 sheets at 8 cards a sheet.
const PAGE_SIZE = 40;

export default async function MemberCardsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const supabase = await createClient();

  // Everyone whose membership hasn't lapsed. As on the Members page, a count
  // comes first so the page range is always computed from a real total.
  const { count, error: countError } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .neq("status", "expired");
  const pageInfo = paginate(parsePage(pageParam), PAGE_SIZE, count ?? 0);

  const { data: members, error: dataError } = countError
    ? { data: null, error: countError }
    : await supabase
        .from("members")
        .select("id, full_name, member_no, photo_url")
        .neq("status", "expired")
        .order("member_no", { ascending: true, nullsFirst: false })
        .order("full_name")
        .order("id")
        .range(pageInfo.from, pageInfo.to);
  const error = countError || dataError;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href="/members" className="text-sm font-medium text-muted hover:text-body">
            ← Members
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-heading">Member cards</h1>
          <p className="mt-1 text-sm text-body">
            Cards for members whose membership hasn&apos;t expired. Printing prints this page, {PAGE_SIZE} at a time. For one
            member, use &ldquo;Print card&rdquo; on their profile.
          </p>
        </div>
        <PrintButton>Print these cards</PrintButton>
      </div>

      {error && <p className="text-sm text-danger">{error.message}</p>}

      {members && members.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-sm text-muted">No members to print cards for.</div>
      ) : (
        <>
          <p className="text-sm text-muted print:hidden">
            {pageInfo.rangeStart}–{pageInfo.rangeEnd} of {(count ?? 0).toLocaleString()} members
          </p>
          <div className="grid justify-items-center gap-[5mm] sm:grid-cols-2 print:grid-cols-2">
            {members?.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>

          {pageInfo.totalPages > 1 && (
            <nav aria-label="Card pages" className="flex items-center justify-between gap-3 pt-1 print:hidden">
              {pageInfo.hasPrev ? (
                <Link
                  href={pageInfo.page - 1 > 1 ? `/members/cards?page=${pageInfo.page - 1}` : "/members/cards"}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-heading hover:bg-app-bg"
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <p className="text-sm text-muted">
                Page {pageInfo.page} of {pageInfo.totalPages}
              </p>
              {pageInfo.hasNext ? (
                <Link
                  href={`/members/cards?page=${pageInfo.page + 1}`}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-heading hover:bg-app-bg"
                >
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
