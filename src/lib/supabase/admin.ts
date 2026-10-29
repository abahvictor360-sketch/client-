import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client for the agent, webhooks and cron. Bypasses RLS: only use
// it server-side and always scope queries by the owning user or business.
export function adminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
