import { BarbellIcon } from "@/components/BarbellIcon";
import { Avatar } from "@/components/Avatar";
import { GYM_NAME } from "@/lib/brand";
import { memberQrSvg } from "@/lib/qrSvg";

// A membership card at credit-card size (85.6 x 54 mm), so it prints on card
// stock or laminates to fit a wallet. It deliberately carries no plan or expiry
// date: those change on every renewal, but the card shouldn't have to be
// reprinted - the QR code just points at the member, and the scan screen looks
// up everything current.
export async function MemberCard({
  member,
}: {
  member: { id: string; full_name: string; member_no: number | null; photo_url: string | null };
}) {
  const qr = await memberQrSvg(member.id);

  return (
    // print-color-adjust keeps the coloured header when printing; browsers
    // otherwise drop backgrounds to save ink.
    <div className="flex h-[54mm] w-[85.6mm] shrink-0 flex-col overflow-hidden rounded-[3mm] border border-border bg-white break-inside-avoid [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      <div className="flex items-center gap-[2mm] bg-primary px-[4mm] py-[2.2mm] text-white">
        <BarbellIcon className="h-[5mm] w-[5mm]" />
        <span className="truncate text-[11pt] leading-none font-bold">{GYM_NAME}</span>
      </div>

      <div className="flex flex-1 items-center justify-between gap-[3mm] px-[4mm]">
        <div className="flex min-w-0 items-center gap-[2.5mm]">
          {member.photo_url && <Avatar src={member.photo_url} name={member.full_name} className="h-[15mm] w-[15mm] shrink-0" />}
          <div className="min-w-0">
            <p className="text-[13pt] leading-tight font-bold text-heading">{member.full_name}</p>
            {member.member_no != null && <p className="mt-[1mm] text-[9pt] text-muted">Member #{member.member_no}</p>}
          </div>
        </div>
        <div
          className="h-[28mm] w-[28mm] shrink-0 [&>svg]:h-full [&>svg]:w-full"
          role="img"
          aria-label={`Check-in code for ${member.full_name}`}
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      </div>

      <p className="pb-[2mm] text-center text-[7pt] text-muted">Scan at the front desk to check in</p>
    </div>
  );
}
