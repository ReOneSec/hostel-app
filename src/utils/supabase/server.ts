import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            console.log(`[SERVER CLIENT] Setting ${cookiesToSet.length} cookies...`);
            cookiesToSet.forEach(({ name, value, options }) => {
              const relaxedOptions = { ...options, secure: process.env.NODE_ENV === "production" ? true : false, sameSite: "lax" as const };
              cookieStore.set(name, value, relaxedOptions)
            })
          } catch (e: any) {
            console.error(`[SERVER CLIENT] Failed to set cookie:`, e.message);
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
