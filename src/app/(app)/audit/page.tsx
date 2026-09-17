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
        <h1 className="text-2xl font-bold text-heading">Audit Log</h1>
        <p className="mt-1 text-sm text-body">Role changes and deletions across the account, most recent first.</p>
      </div>

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-app-bg">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted">When</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(events as unknown as AuditEvent[])?.map((event) => (
                <tr key={event.id} className="hover:bg-app-bg">
                  <td className="whitespace-nowrap px-4 py-3 text-body">
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-heading">{summarize(event)}</td>
                </tr>
              ))}
              {(!events || events.length === 0) && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted">
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
