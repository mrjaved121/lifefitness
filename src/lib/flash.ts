import { cookies } from "next/headers";

export type FlashType = "success" | "error";

// Server Actions can't hand a message to the client directly when they
// redirect (client state is lost), so the message rides along in a
// short-lived, client-readable cookie that <FlashToast /> shows once and clears.
export async function setFlash(message: string, type: FlashType = "success") {
  const cookieStore = await cookies();
  cookieStore.set("flash", JSON.stringify({ message, type }), {
    path: "/",
    maxAge: 30,
    httpOnly: false,
    sameSite: "lax",
  });
}
