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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {error && <p className="border-b border-gray-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {staff.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{s.full_name || "—"}</td>
              <td className="px-4 py-3 text-gray-500">{s.email || "—"}</td>
              <td className="px-4 py-3 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                {s.id === currentUserId ? (
                  <span className="capitalize text-gray-500">{s.role.replace("_", " ")} (you)</span>
                ) : (
                  <select
                    defaultValue={s.role}
                    disabled={isPending}
                    onChange={(e) => handleChange(s.id, e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="front_desk">Front desk</option>
                    <option value="owner">Owner</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                )}
              </td>
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                No staff found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
