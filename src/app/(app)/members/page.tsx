import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { LinkButton } from "@/components/LinkButton";
import { formatDate, todayStr, addDays } from "@/lib/format";

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
];

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("members")
    .select("id, full_name, phone, email, photo_url, end_date, status, plans(name)")
    .order("full_name", { ascending: true });

  if (q) {
    // PostgREST's `.or()` treats `,()"` as structural, so quote the value
    // (escaping embedded quotes) to search safely for terms like "Smith, Jr".
    const term = `%${q}%`.replace(/"/g, '\\"');
    query = query.or(`full_name.ilike."${term}",phone.ilike."${term}",email.ilike."${term}"`);
  }
  if (status === "expiring") {
    query = query.eq("status", "active").lte("end_date", addDays(todayStr(), 7));
  } else if (status) {
    query = query.eq("status", status);
  }

  const { data: members, error } = await query;

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
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (f.value) params.set("status", f.value);
            const href = params.toString() ? `/members?${params.toString()}` : "/members";
            const active = (status || "") === f.value;
            return (
              <Link
                key={f.value}
                href={href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-primary text-white" : "border border-border bg-surface text-body hover:bg-app-bg"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <p className="text-sm text-muted">{members?.length ?? 0} members</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members?.map((m) => (
                  <tr key={m.id} className="hover:bg-app-bg">
                    <td className="px-4 py-3">
                      <Link href={`/members/${m.id}`} className="flex items-center gap-3 font-medium text-heading hover:text-primary">
                        <Avatar src={m.photo_url} name={m.full_name} className="h-9 w-9 shrink-0 text-xs" />
                        {m.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-body">{m.phone || m.email || "—"}</td>
                    <td className="px-4 py-3 text-body">{(m.plans as unknown as { name: string } | null)?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-body">{formatDate(m.end_date)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} endDate={m.end_date} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {members?.map((m) => (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="rounded-xl border border-border bg-surface p-4 active:bg-app-bg"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={m.photo_url} name={m.full_name} className="h-10 w-10 shrink-0 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-heading">{m.full_name}</p>
                    <p className="truncate text-sm text-muted">{(m.plans as unknown as { name: string } | null)?.name ?? "No plan"}</p>
                  </div>
                  <StatusBadge status={m.status} endDate={m.end_date} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted">Expires</span>
                  <span className="font-medium text-heading">{formatDate(m.end_date)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
