// What a member's QR card encodes. The member's id is a random UUID, so a
// printed card can't be guessed or counted up from #1. The prefix is only there
// so the code is recognisable in any scanner app, and it's uppercase because
// QR's alphanumeric mode (digits, capitals, "-" and ":") packs the whole
// payload into a smaller, easier-to-scan code than mixed case would.
const PREFIX = "MEMBER:";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function memberQrPayload(memberId: string) {
  return `${PREFIX}${memberId.toUpperCase()}`;
}

// Pulls the member id out of whatever a scanner read. A USB scanner types the
// code like a keyboard, and on some keyboard layouts that garbles ":", so the
// id is found by its shape rather than by trusting the prefix. Returns the id
// lower-cased (how the database stores it), or null when there isn't one.
export function parseMemberQr(text: string) {
  const match = text.match(UUID);
  return match ? match[0].toLowerCase() : null;
}
