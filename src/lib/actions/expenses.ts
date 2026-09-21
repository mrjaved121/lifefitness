"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { setFlash } from "@/lib/flash";
import { isExpenseCategory } from "@/lib/expenses";
import { isRealDate } from "@/lib/reports";
import { withMigrationHint } from "@/lib/migrations";

export type ActionState = { error: string | null };

const MAX_AMOUNT = 1_000_000_000;

// Expenses are owner-only. The database enforces that too (RLS); checking
// here first just turns an opaque policy error into a clear message.
export async function createExpense(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!isOwner(await getCurrentProfile())) return { error: "Only owners can record expenses." };

  const category = String(formData.get("category") || "");
  const amount = Math.round(Number(formData.get("amount") || 0) * 100) / 100;
  const expense_date = String(formData.get("expense_date") || "");
  const notes = String(formData.get("notes") || "").trim().slice(0, 500) || null;

  if (!isExpenseCategory(category)) return { error: "Choose a category." };
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    return { error: "Enter an amount greater than zero." };
  }
  if (!isRealDate(expense_date)) return { error: "Enter a valid date." };

  // recorded_by is filled in by the database from the signed-in user.
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({ category, amount, expense_date, notes });
  if (error) return { error: withMigrationHint(error.message) };

  await setFlash("Expense added");
  revalidatePath("/expenses");
  revalidatePath("/reports");
  return { error: null };
}

export async function deleteExpense(id: string) {
  if (!isOwner(await getCurrentProfile())) {
    await setFlash("Only owners can delete expenses.", "error");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) {
    await setFlash(`Couldn't delete expense: ${error.message}`, "error");
    return;
  }

  await setFlash("Expense deleted");
  revalidatePath("/expenses");
  revalidatePath("/reports");
}
