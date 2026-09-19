"use client";

import { useActionState } from "react";
import { updateMember, type ActionState } from "@/lib/actions/members";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar } from "@/components/Avatar";
import type { Member } from "@/types/database";

const initialState: ActionState = { error: null };
const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-heading focus:border-primary focus:outline-none";

export function EditMemberForm({ member }: { member: Member }) {
  const action = updateMember.bind(null, member.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-lg space-y-4 rounded-xl border border-border bg-surface p-6">
      {state.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}

      <div>
        <label className="block text-sm font-medium text-body">Photo</label>
        <div className="mt-1 flex items-center gap-3">
          <Avatar src={member.photo_url} name={member.full_name} className="h-12 w-12 shrink-0 text-sm" />
          <input
            name="photo"
            type="file"
            accept="image/*"
            className="flex-1 text-sm text-body file:mr-3 file:rounded-lg file:border-0 file:bg-app-bg file:px-3 file:py-2 file:text-sm file:font-medium file:text-heading hover:file:bg-border"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-body">Full name</label>
        <input name="full_name" defaultValue={member.full_name} required className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-body">Phone</label>
          <input name="phone" defaultValue={member.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-body">Email</label>
          <input name="email" type="email" defaultValue={member.email ?? ""} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-body">Address</label>
        <input name="address" defaultValue={member.address ?? ""} className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-body">Notes</label>
        <textarea name="notes" rows={3} defaultValue={member.notes ?? ""} className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-body">Status</label>
        <select name="status" defaultValue={member.status} className={inputClass}>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="flex items-center justify-end">
        <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
      </div>
    </form>
  );
}
