"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";

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
