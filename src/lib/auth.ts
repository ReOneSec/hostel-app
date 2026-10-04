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
  
  // Only use getSession() — reads from cookie, NO network call.
  // The middleware already verified the token via getUser(), so we can trust the session here.
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;

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
