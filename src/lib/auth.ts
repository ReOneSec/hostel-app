import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { cache } from "react";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export interface Session {
  user: {
    id: string;
    email: string;
    role: Role;
    status: string;
    isFirstLogin: boolean;
    isProfileComplete: boolean;
    needsSelfieUpdate: boolean;
    privacyConsentAt: Date | null;
    username: string;
  };
}

export const auth = cache(async (): Promise<Session | null> => {
  let email: string | null | undefined = null;

  // 1. Try Bearer token from Authorization header (App / API client)
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization") || headersList.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnonKey) {
          const supabaseAuth = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data, error } = await supabaseAuth.auth.getUser(token);
          if (error || !data?.user?.email) {
            if (process.env.NODE_ENV === "development") {
              console.error("[AUTH] Invalid bearer token:", error?.message || "No email in user");
            }
            return null;
          }
          email = data.user.email;
        }
      }
    }
  } catch {
    // Allowed when called outside request scope (e.g. tests or build time)
  }

  // 2. Fall back to cookie session (Website)
  if (!email) {
    try {
      const supabase = await createClient();
      
      // Try getSession() first — reads from cookie
      const { data: { session } } = await supabase.auth.getSession();
      email = session?.user?.email;

      // Fallback to getUser() to ensure robust token extraction across route handlers
      if (!email) {
        const { data: { user } } = await supabase.auth.getUser();
        email = user?.email;
      }
    } catch {
      // Cookie reading fallback failed
    }
  }

  if (!email) {
    if (process.env.NODE_ENV === "development") {
      console.error("[AUTH] Supabase session missing or has no email");
    }
    return null;
  }

  // Single DB lookup — no redundant getUser() call
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      isFirstLogin: true,
      isProfileComplete: true,
      needsSelfieUpdate: true,
      privacyConsentAt: true,
      username: true,
    }
  });

  if (!dbUser) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[AUTH] User not found in DB for email: ${email}`);
    }
    return null;
  }

  if (dbUser.status !== "ACTIVE") {
    if (process.env.NODE_ENV === "development") {
      console.error(`[AUTH] User found but not ACTIVE: ${email}, status: ${dbUser.status}`);
    }
    return null;
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
      isFirstLogin: dbUser.isFirstLogin,
      isProfileComplete: dbUser.isProfileComplete,
      needsSelfieUpdate: dbUser.needsSelfieUpdate,
      privacyConsentAt: dbUser.privacyConsentAt,
      username: dbUser.username,
    },
  };
});
