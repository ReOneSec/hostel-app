import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(clientIp, "login");
    if (!rateCheck.success) {
      const res = errorResponse(
        "Too many login attempts. Please try again later.",
        429,
        "RATE_LIMITED"
      );
      res.headers.set("Retry-After", String(rateCheck.retryAfter));
      return res;
    }

    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse("Invalid email or password format", 400, "VALIDATION_ERROR");
    }

    const { email, password } = parseResult.data;


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("Authentication service is unavailable", 500, "INTERNAL");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.session) {
      return errorResponse("Invalid credentials", 401, "UNAUTHORIZED");
    }

    const dbUser = await prisma.user.findUnique({
      where: { email },
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
    console.error("[Auth Login]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
