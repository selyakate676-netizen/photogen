import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleConfig } from "@/lib/env";
import type { Database } from "@/types/database";

export function createServiceRoleClient() {
  const config = getSupabaseServiceRoleConfig();

  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
