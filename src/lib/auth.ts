import { createClient } from "@/utils/supabase/server";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export interface Session {
  user: {
    id: string;
    email: string;
    role: Role;
    isFirstLogin: boolean;
    isProfileComplete: boolean;
    needsSelfieUpdate: boolean;
    username: string;
  };
}

export async function auth(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    console.error("[AUTH] Supabase user missing or has no email", user);
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    console.error(`[AUTH] User not found in DB for email: ${user.email}`);
    return null;
  }

  if (dbUser.status !== "ACTIVE") {
    console.error(`[AUTH] User found but not ACTIVE: ${user.email}, status: ${dbUser.status}`);
    return null;
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      isFirstLogin: dbUser.isFirstLogin,
      isProfileComplete: dbUser.isProfileComplete,
      needsSelfieUpdate: dbUser.needsSelfieUpdate,
      username: dbUser.username,
    },
  };
}
