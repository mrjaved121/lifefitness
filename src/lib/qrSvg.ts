import QRCode from "qrcode";
import { memberQrPayload } from "./qr";

// `text` as an inline SVG string (no width/height attributes, so CSS sizes
// it). Medium error correction survives a scuffed card or a crease in a
// printed receipt; the 2-module margin is the blank border scanners need.
// Server-side only: only ever called with a value this app generates
// (a member id or a URL to our own domain), never arbitrary user text.
export function svgQrCode(text: string) {
  return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
}

export function memberQrSvg(memberId: string) {
  return svgQrCode(memberQrPayload(memberId));
}
