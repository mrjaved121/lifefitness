"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/format";
import { setFlash } from "@/lib/flash";

export type ActionState = { error: string | null };

async function uploadMemberPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photo: File
): Promise<{ url: string | null; error: string | null }> {
  const ext = photo.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("member-photos").upload(path, photo);
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from("member-photos").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function createMember(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const plan_id = String(formData.get("plan_id") || "") || null;
  const start_date = String(formData.get("start_date") || "");
  const photo = formData.get("photo") as File | null;

  if (!full_name || !start_date || !plan_id) {
    return { error: "Name, plan, and start date are required." };
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("duration_days")
    .eq("id", plan_id)
    .single();

  if (planError || !plan) return { error: "Selected plan was not found." };

  let photo_url: string | null = null;
  if (photo && photo.size > 0) {
    const uploaded = await uploadMemberPhoto(supabase, photo);
    if (uploaded.error) return { error: uploaded.error };
    photo_url = uploaded.url;
  }

  const end_date = addDays(start_date, plan.duration_days);

  const { data, error } = await supabase
    .from("members")
    .insert({
      full_name,
      phone,
      email,
      address,
      notes,
      photo_url,
      plan_id,
      start_date,
      end_date,
      status: "active",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await setFlash("Member added successfully");
  revalidatePath("/members");
  redirect(`/members/${data.id}`);
}

export async function updateMember(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const status = String(formData.get("status") || "active");
  const photo = formData.get("photo") as File | null;

  if (!full_name) return { error: "Name is required." };

  const update: Record<string, unknown> = { full_name, phone, email, address, notes, status };

  if (photo && photo.size > 0) {
    const uploaded = await uploadMemberPhoto(supabase, photo);
    if (uploaded.error) return { error: uploaded.error };
    update.photo_url = uploaded.url;
  }

  const { error } = await supabase.from("members").update(update).eq("id", id);

  if (error) return { error: error.message };

  await setFlash("Changes saved");
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}`);
}

export async function toggleFreeze(id: string, freeze: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ status: freeze ? "frozen" : "active" })
    .eq("id", id);
  if (error) {
    await setFlash(`Couldn't update membership: ${error.message}`, "error");
    return;
  }
  await setFlash(freeze ? "Membership frozen" : "Membership unfrozen");
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
}

export async function deleteMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) {
    await setFlash(`Couldn't delete member: ${error.message}`, "error");
    return;
  }
  await setFlash("Member deleted");
  revalidatePath("/members");
  redirect("/members");
}

export async function renewMembership(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const member_id = String(formData.get("member_id") || "");
  const plan_id = String(formData.get("plan_id") || "");
  const amount = Number(formData.get("amount") || 0);
  const method = String(formData.get("method") || "cash");
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!member_id || !plan_id) return { error: "Plan is required." };

  const { error } = await supabase.rpc("renew_membership", {
    p_member_id: member_id,
    p_plan_id: plan_id,
    p_amount: amount,
    p_method: method,
    p_notes: notes,
    p_recorded_by: user.id,
  });

  if (error) return { error: error.message };

  await setFlash("Membership renewed");
  revalidatePath("/members");
  revalidatePath(`/members/${member_id}`);
  redirect(`/members/${member_id}`);
}
