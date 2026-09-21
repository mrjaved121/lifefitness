import QRCode from "qrcode";
import { memberQrPayload } from "./qr";

// The member's QR code as an inline SVG string (no width/height attributes, so
// CSS sizes it). Medium error correction survives a scuffed or slightly
// creased card; the 2-module margin is the blank border scanners need.
// Server-side only: it's rendered from the id we generate, never user text.
export function memberQrSvg(memberId: string) {
  return QRCode.toString(memberQrPayload(memberId), { type: "svg", errorCorrectionLevel: "M", margin: 2 });
}
