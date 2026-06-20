import { createClient } from "@/utils/supabase/server";
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
  const supabase = await createClient();
  
  // Get session quickly from cookie without network request
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;

  if (!email) {
    if (process.env.NODE_ENV === "development") {
      console.error("[AUTH] Supabase session missing or has no email");
    }
    return null;
  }

  // Run DB lookup and token verification concurrently
  const [dbUser, { data: { user } }] = await Promise.all([
    prisma.user.findUnique({
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
    }),
    supabase.auth.getUser()
  ]);

  if (!user || !user.email) {
    if (process.env.NODE_ENV === "development") {
      console.error("[AUTH] Supabase user verification failed", user);
    }
    return null;
  }

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
