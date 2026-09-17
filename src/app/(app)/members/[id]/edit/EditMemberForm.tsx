"use client";

import { useActionState } from "react";
import { updateMember, type ActionState } from "@/lib/actions/members";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar } from "@/components/Avatar";
import type { Member } from "@/types/database";

const initialState: ActionState = { error: null };

export function EditMemberForm({ member }: { member: Member }) {
  const action = updateMember.bind(null, member.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-lg space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700">Photo</label>
        <div className="mt-1 flex items-center gap-3">
          <Avatar src={member.photo_url} name={member.full_name} className="h-12 w-12 shrink-0 text-sm" />
          <input
            name="photo"
            type="file"
            accept="image/*"
            className="flex-1 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Full name</label>
        <input
          name="full_name"
          defaultValue={member.full_name}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            name="phone"
            defaultValue={member.phone ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={member.email ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          name="status"
          defaultValue={member.status}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
    </form>
  );
}
