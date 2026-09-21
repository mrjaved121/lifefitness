"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";
import { parseMemberQr } from "@/lib/qr";
import { todayStr } from "@/lib/format";

// What the scan screen needs to show about the member it just looked up.
export type ScanMember = {
  id: string;
  fullName: string;
  memberNo: number | null;
  planName: string | null;
  photoUrl: string | null;
  status: string;
  endDate: string;
  outstanding: number;
};

export type ScanResult =
  | { kind: "checked_in" | "already"; member: ScanMember }
  | { kind: "blocked"; member: ScanMember; reason: "expired" | "frozen" }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

// Check a member in from a scanned QR code (or a pasted/typed one). Unlike
// checkInMember this returns the outcome instead of setting a flash, so the
// scan screen can stay open and show it. A lapsed or frozen member is NOT
// checked in until staff confirm with force = true: at the door that's the
// moment to have the renewal conversation, and it keeps attendance honest.
export async function scanCheckIn(code: string, force = false): Promise<ScanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "error", message: "Not signed in." };

  const memberId = parseMemberQr(String(code).slice(0, 200));
  if (!memberId) return { kind: "not_found" };

  // Row-level security means only staff can see members at all, so this is
  // also the permission check: anyone else just gets "not found".
  const [{ data: member, error: memberError }, { data: balance }] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, member_no, photo_url, status, end_date, plans(name)")
      .eq("id", memberId)
      .maybeSingle(),
    supabase.from("member_balances").select("outstanding").eq("member_id", memberId).maybeSingle(),
  ]);
  if (memberError) return { kind: "error", message: memberError.message };
  if (!member) return { kind: "not_found" };

  const info: ScanMember = {
    id: member.id,
    fullName: member.full_name,
    memberNo: member.member_no,
    planName: (member.plans as unknown as { name: string } | null)?.name ?? null,
    photoUrl: member.photo_url,
    status: member.status,
    endDate: member.end_date,
    outstanding: Number(balance?.outstanding ?? 0),
  };

  const reason =
    member.status === "frozen" ? "frozen" : member.status === "expired" || member.end_date < todayStr() ? "expired" : null;
  if (reason && !force) return { kind: "blocked", member: info, reason };

  const { error } = await supabase.from("check_ins").insert({ member_id: memberId, checked_in_by: user.id });
  if (error) {
    // 23505 = the (member_id, check_in_date) row already exists: a second
    // scan of the same card today, not a failure.
    if (error.code === "23505") return { kind: "already", member: info };
    return { kind: "error", message: `Couldn't check in: ${error.message}` };
  }

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/dashboard");
  return { kind: "checked_in", member: info };
}

export async function checkInMember(memberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await setFlash("Not signed in.", "error");
    return;
  }

  // check_in_date defaults to current_date in the database, so "today" is
  // always the server's calendar day - consistent with the rest of the app
  // treating every stored date as a UTC calendar day (see lib/format.ts).
  const { error } = await supabase.from("check_ins").insert({ member_id: memberId, checked_in_by: user.id });

  if (error) {
    // 23505 = unique_violation, i.e. the (member_id, check_in_date) row
    // already exists - the DB constraint is what actually prevents a
    // double-tap from creating two visits, this just gives a clear message.
    await setFlash(error.code === "23505" ? "Already checked in today." : `Couldn't check in: ${error.message}`, "error");
    return;
  }

  await setFlash("Checked in");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/dashboard");
}

export async function deleteCheckIn(id: string, memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("check_ins").delete().eq("id", id);
  if (error) {
    await setFlash(`Couldn't remove check-in: ${error.message}`, "error");
    return;
  }
  await setFlash("Check-in removed");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/dashboard");
}
