import { createServerClient } from '@supabase/ssr'
import { clearSupabaseAuthCookies } from '@/lib/auth/supabase-cookie-cleanup'
import { getSupabasePublicConfig } from '@/lib/env'
import type { Database } from '@/types/database'
import { cookies } from 'next/headers'


export async function clearCurrentSupabaseAuthCookies() {
  const cookieStore = await cookies()
  const supabaseConfig = getSupabasePublicConfig()
  return clearSupabaseAuthCookies(cookieStore, supabaseConfig.url)
}
export async function createClient() {
  const cookieStore = await cookies()
  const supabaseConfig = getSupabasePublicConfig()

  return createServerClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
