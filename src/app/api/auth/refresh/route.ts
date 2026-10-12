import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = refreshSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse("Refresh token is required", 400, "VALIDATION_ERROR");
    }

    const { refreshToken } = parseResult.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("Authentication service is unavailable", 500, "INTERNAL");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (authError || !authData?.session || !authData.user?.email) {
      return errorResponse("Invalid or expired refresh token", 401, "UNAUTHORIZED");
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: authData.user.email },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        isProfileComplete: true,
        isFirstLogin: true,
      },
    });

    if (!dbUser) {
      return errorResponse("User record not found", 404, "NOT_FOUND");
    }

    if (dbUser.status !== "ACTIVE") {
      return errorResponse("Account is not active", 403, "FORBIDDEN");
    }

    return successResponse({
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresIn: authData.session.expires_in ?? 3600,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        role: dbUser.role,
        status: dbUser.status,
        isProfileComplete: dbUser.isProfileComplete,
        isFirstLogin: dbUser.isFirstLogin,
      },
    });
  } catch (error) {
    console.error("[Auth Refresh]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
