import Link from "next/link";
import { CheckInScanner } from "@/components/CheckInScanner";
import { buttonVariants } from "@/components/buttonStyles";

export default function CheckInPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">Check-in</h1>
          <p className="mt-1 text-sm text-body">Scan a member&apos;s QR card to record their visit.</p>
        </div>
        <Link href="/members/cards" className={buttonVariants.secondary}>
          Print member cards
        </Link>
      </div>

      <CheckInScanner />
    </div>
  );
}
