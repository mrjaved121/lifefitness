import { headers } from "next/headers";

// An absolute URL to `path` on whatever domain this request actually arrived
// on - so printed material (a receipt's QR code) points at the gym's real
// domain with no extra per-gym setup. x-forwarded-host/-proto are what
// Vercel's edge sets when a custom domain is used; host/protocol cover local
// dev and any other host. The Host header is attacker-influenceable in
// general, but here it only ever lands in a QR code's *encoded bytes*
// (never printed as text, never parsed as HTML), so a spoofed value can only
// make the code point somewhere wrong, not inject anything.
export async function absoluteUrl(path: string) {
  const list = await headers();
  const host = list.get("x-forwarded-host") || list.get("host") || "localhost:3000";
  const proto = list.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
