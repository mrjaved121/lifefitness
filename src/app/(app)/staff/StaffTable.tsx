"use client";

import { useState, useTransition } from "react";
import { updateStaffRole } from "@/lib/actions/staff";

type StaffMember = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  front_desk: "Front Desk",
  owner: "Owner",
  super_admin: "Super Admin",
  pending: "Pending approval",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-app-bg px-2.5 py-1 text-xs font-medium text-body">
      {ROLE_LABEL[role] || role}
    </span>
  );
}

export function StaffTable({ staff, currentUserId }: { staff: StaffMember[]; currentUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(id: string, role: string) {
    setError(null);
    startTransition(async () => {
      try {
        await updateStaffRole(id, role);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update role.");
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      {error && <p className="border-b border-border bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-app-bg">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Email</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Joined</th>
            <th className="px-4 py-3 text-left font-medium text-muted">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {staff.map((s) => (
            <tr key={s.id} className="hover:bg-app-bg">
              <td className="px-4 py-3 font-medium text-heading">{s.full_name || "—"}</td>
              <td className="px-4 py-3 text-body">{s.email || "—"}</td>
              <td className="px-4 py-3 text-body">{new Date(s.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                {s.id === currentUserId ? (
                  <div className="flex items-center gap-2">
                    <RoleBadge role={s.role} />
                    <span className="text-xs text-muted">(you)</span>
                  </div>
                ) : (
                  <select
                    defaultValue={s.role}
                    disabled={isPending}
                    onChange={(e) => handleChange(s.id, e.target.value)}
                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-heading focus:border-primary focus:outline-none disabled:opacity-50"
                  >
                    <option value="front_desk">Front desk</option>
                    <option value="owner">Owner</option>
                    <option value="super_admin">Super admin</option>
                    <option value="pending">Pending approval (no access)</option>
                  </select>
                )}
              </td>
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted">
                No staff found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
