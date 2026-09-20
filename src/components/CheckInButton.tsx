"use client";

import { useFormStatus } from "react-dom";
import { checkInMember } from "@/lib/actions/checkins";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-heading transition-colors hover:bg-app-bg disabled:opacity-50"
    >
      {pending ? "…" : "Check In"}
    </button>
  );
}

export function CheckInButton({ memberId, checkedIn }: { memberId: string; checkedIn: boolean }) {
  if (checkedIn) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
        </svg>
        Checked in
      </span>
    );
  }
  return (
    <form action={checkInMember.bind(null, memberId)}>
      <Submit />
    </form>
  );
}
