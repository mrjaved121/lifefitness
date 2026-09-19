"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setFlash } from "@/lib/flash";

export type ActionState = { error: string | null };

export async function createPlan(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const duration_days = Number(formData.get("duration_days") || 0);
  const price = Number(formData.get("price") || 0);

  if (!name || duration_days <= 0 || price < 0) {
    return { error: "Enter a valid name, duration, and price." };
  }

  const { error } = await supabase.from("plans").insert({ name, description, duration_days, price });
  if (error) return { error: error.message };

  await setFlash("Plan created");
  revalidatePath("/plans");
  return { error: null };
}

export async function updatePlan(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const duration_days = Number(formData.get("duration_days") || 0);
  const price = Number(formData.get("price") || 0);

  if (!name || duration_days <= 0 || price < 0) {
    return { error: "Enter a valid name, duration, and price." };
  }

  const { error } = await supabase
    .from("plans")
    .update({ name, description, duration_days, price })
    .eq("id", id);
  if (error) return { error: error.message };

  await setFlash("Plan updated");
  revalidatePath("/plans");
  return { error: null };
}

export async function togglePlanActive(id: string, is_active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("plans").update({ is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  await setFlash(is_active ? "Plan activated" : "Plan deactivated");
  revalidatePath("/plans");
}

export async function deletePlan(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await setFlash("Plan deleted");
  revalidatePath("/plans");
}
