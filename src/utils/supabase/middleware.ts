import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const relaxedOptions = { ...options, secure: process.env.NODE_ENV === "production" ? true : false, sameSite: "lax" as const };
            console.log(`[COOKIE SET] name=${name}, domain=${relaxedOptions.domain}, secure=${relaxedOptions.secure}`);
            request.cookies.set(name, value);
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            const relaxedOptions = { ...options, secure: process.env.NODE_ENV === "production" ? true : false, sameSite: "lax" as const };
            supabaseResponse.cookies.set(name, value, relaxedOptions)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
