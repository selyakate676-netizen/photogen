import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseBrowserConfig } from '@/lib/public-env'
import type { Database } from '@/types/database'

export function createClient() {
  const supabaseConfig = getSupabaseBrowserConfig()

  return createBrowserClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey
  )
}
