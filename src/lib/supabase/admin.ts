import { createClient } from "@supabase/supabase-js";

// Service-role client for server contexts with no user session (e.g. cron
// jobs). Bypasses RLS entirely, so only use it where the caller has already
// been authorized some other way (e.g. a cron secret check).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
