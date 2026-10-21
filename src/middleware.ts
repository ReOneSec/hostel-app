import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// Route protection matrix
const ROLE_ROUTES: Record<string, string[]> = {
  "/admin/users": ["SUPER_ADMIN", "HOSTEL_MANAGER"],
  "/admin": ["SUPER_ADMIN"],
  "/manager/mess": ["SUPER_ADMIN", "HOSTEL_MANAGER", "MONTHLY_MANAGER"],
  "/manager": ["SUPER_ADMIN", "HOSTEL_MANAGER"],
  "/monthly-manager": ["MONTHLY_MANAGER"],
  "/student": ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
};

// Allowed origins for CORS (Mobile Capacitor runtime, localhost dev, production web)
const ALLOWED_ORIGIN_PATTERNS = [
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://mirrormess.vercel.app",
];

function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl && origin.toLowerCase() === configuredAppUrl.toLowerCase()) {
    return origin;
  }
  if (ALLOWED_ORIGIN_PATTERNS.includes(origin)) {
    return origin;
  }
  if (origin.endsWith(".vercel.app")) {
    return origin;
  }
  return null;
}

function setCorsHeaders(headers: Headers, origin: string | null) {
  const allowedOrigin = getAllowedOrigin(origin);
  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, x-cron-secret, Accept"
  );
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  headers.set("Access-Control-Max-Age", "86400");
}

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/reset-password", "/api/auth", "/verify"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Handle API routes (CORS + Rate Limiting)
  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      const preflightResponse = new NextResponse(null, { status: 204 });
      setCorsHeaders(preflightResponse.headers, origin);
      return preflightResponse;
    }

    // General API rate limiting (300 req/min per IP/client)
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, "api");
    if (!rateCheck.success) {
      const rateResponse = NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
      setCorsHeaders(rateResponse.headers, origin);
      rateResponse.headers.set("Retry-After", String(rateCheck.retryAfter));
      return rateResponse;
    }

    // Early-return for all API routes — allow route handlers and auth() to handle their own auth
    const apiResponse = NextResponse.next();
    setCorsHeaders(apiResponse.headers, origin);
    return apiResponse;
  }

  // Use X-Forwarded headers if behind a proxy (like Cloudflare Tunnel)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "http";
  const baseUrl = forwardedHost 
    ? `${forwardedProto}://${forwardedHost}`
    : request.nextUrl.origin;

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Update Supabase session for page routes
  const { supabaseResponse, user } = await updateSession(request);

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // If already authenticated and trying to access login, redirect to dashboard
    if (pathname.startsWith("/login") && user) {
      const role = user.app_metadata?.role || "STUDENT";
      return NextResponse.redirect(
        new URL(getDashboardRoute(role), baseUrl)
      );
    }
    return supabaseResponse;
  }



  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = user.app_metadata?.role || "STUDENT";
  const needsSelfieUpdate = user.user_metadata?.needsSelfieUpdate ?? false;
  const isProfileComplete = user.user_metadata?.isProfileComplete;

  // Hard profile-completion gate (Item 11, app v1.8.7 parity)
  // Student with isProfileComplete = false is locked to /student/complete-profile until done
  if (role === "STUDENT" && isProfileComplete === false) {
    if (!pathname.startsWith("/student/complete-profile") && !pathname.startsWith("/student/upload-selfie")) {
      return NextResponse.redirect(
        new URL("/student/complete-profile", baseUrl)
      );
    }
    return supabaseResponse;
  }

  // Student selfie update gate (after transfer)
  if (role === "STUDENT" && needsSelfieUpdate) {
    if (!pathname.startsWith("/student/upload-selfie")) {
      return NextResponse.redirect(
        new URL("/student/upload-selfie", baseUrl)
      );
    }
    return supabaseResponse;
  }

  // Role-based route protection
  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(role)) {
        // Redirect to their correct dashboard
        return NextResponse.redirect(
          new URL(getDashboardRoute(role), baseUrl)
        );
      }
      return supabaseResponse;
    }
  }

  // Root path → redirect to role-specific dashboard
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(getDashboardRoute(role), baseUrl)
    );
  }

  return supabaseResponse;
}

function getDashboardRoute(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "HOSTEL_MANAGER":
      return "/manager/mess";
    case "MONTHLY_MANAGER":
      return "/monthly-manager/mess";
    case "STUDENT":
      return "/student/dashboard";
    default:
      return "/login";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\..*).*)"
  ],
};
