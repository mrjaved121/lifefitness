import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";

type AuditEvent = {
  id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null } | null;
};

function summarize(event: AuditEvent) {
  const actor = event.actor?.full_name || "Someone";
  if (event.action === "role_change") {
    const details = event.details as { from?: string; to?: string; target_name?: string } | null;
    return `${actor} changed ${details?.target_name || "an account"}'s role from ${details?.from} to ${details?.to}`;
  }
  const name = (event.details as { full_name?: string; name?: string } | null)?.full_name ??
    (event.details as { name?: string } | null)?.name;
  return `${actor} deleted a ${event.target_table.replace(/s$/, "")}${name ? ` (${name})` : ""}`;
}

export default async function AuditPage() {
  const profile = await getCurrentProfile();
  if (!isSuperAdmin(profile)) notFound();

  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("audit_log")
    .select("id, action, target_table, target_id, details, created_at, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit log</h1>
        <p className="mt-1 text-sm text-gray-500">Role changes and deletions across the account, most recent first.</p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">When</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(events as unknown as AuditEvent[])?.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{summarize(event)}</td>
                </tr>
              ))}
              {(!events || events.length === 0) && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                    No events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
