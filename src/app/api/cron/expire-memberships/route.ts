import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Runs on a schedule (see vercel.json) to flip members past their end_date
// to 'expired' automatically, instead of relying on someone opening the
// dashboard to notice. Vercel sends `Authorization: Bearer $CRON_SECRET`
// automatically for its own cron invocations once CRON_SECRET is set as an
// env var; anyone else calling this without that header gets rejected.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("sync_member_status");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
