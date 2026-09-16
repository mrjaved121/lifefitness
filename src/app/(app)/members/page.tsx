import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import type { MemberStatus } from "@/types/database";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("members")
    .select("id, full_name, phone, email, end_date, status, plans(name)")
    .order("full_name", { ascending: true });

  if (q) {
    // PostgREST's `.or()` treats `,()"` as structural, so quote the value
    // (escaping embedded quotes) to search safely for terms like "Smith, Jr".
    const term = `%${q}%`.replace(/"/g, '\\"');
    query = query.or(`full_name.ilike."${term}",phone.ilike."${term}",email.ilike."${term}"`);
  }
  if (status) {
    query = query.eq("status", status as MemberStatus);
  }

  const { data: members, error } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
        <Link
          href="/members/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Add member
        </Link>
      </div>

      <form className="flex gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name, phone, or email"
          className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status || ""}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="frozen">Frozen</option>
        </select>
        <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100">
          Filter
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Expires</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members?.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/members/${m.id}`} className="font-medium text-gray-900 hover:underline">
                    {m.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{m.phone || "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {(m.plans as unknown as { name: string } | null)?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(m.end_date)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={m.status} />
                </td>
              </tr>
            ))}
            {members?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
