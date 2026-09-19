"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";

export type ActionState = { error: string | null };

export async function addPayment(memberId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const amount = Number(formData.get("amount") || 0);
  const method = String(formData.get("method") || "cash");
  const payment_date = String(formData.get("payment_date") || "");
  const notes = String(formData.get("notes") || "").trim() || null;

  if (amount <= 0 || !payment_date) {
    return { error: "Enter a valid amount and date." };
  }

  const { error } = await supabase.from("payments").insert({
    member_id: memberId,
    amount,
    method,
    payment_date,
    notes,
    recorded_by: user.id,
  });

  if (error) return { error: error.message };

  await setFlash("Payment recorded");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/reports");
  return { error: null };
}

export async function deletePayment(id: string, memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await setFlash("Payment deleted");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/reports");
}
