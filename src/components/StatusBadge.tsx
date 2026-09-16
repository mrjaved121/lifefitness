import type { MemberStatus } from "@/types/database";

const STYLES: Record<MemberStatus, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  frozen: "bg-blue-100 text-blue-800",
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STYLES[status]}`}>
      {status}
    </span>
  );
}
