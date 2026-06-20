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

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/reset-password", "/api/auth", "/verify"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
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

  if (process.env.NODE_ENV === "development") {
    console.log(`[MIDDLEWARE] Processing ${pathname}`);
    console.log(`[MIDDLEWARE] Headers Host:`, request.headers.get("host"));
    console.log(`[MIDDLEWARE] Cookies received:`, request.cookies.getAll().map(c => c.name));
  }

  // Update Supabase session
  const { supabaseResponse, user } = await updateSession(request);
  
  if (process.env.NODE_ENV === "development") {
    if (!user) {
      console.log(`[MIDDLEWARE] User is NULL for ${pathname}`);
    } else {
      console.log(`[MIDDLEWARE] User found: ${user.email}`);
    }
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // If already authenticated and trying to access login, redirect to dashboard
    if (pathname.startsWith("/login") && user) {
      const role = user.user_metadata?.role || "STUDENT";
      return NextResponse.redirect(
        new URL(getDashboardRoute(role), baseUrl)
      );
    }
    return supabaseResponse;
  }

  // Allow API routes to handle their own auth (except protected dashboard routes)
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = user.user_metadata?.role || "STUDENT";
  const isProfileComplete = user.user_metadata?.isProfileComplete ?? true;
  const needsSelfieUpdate = user.user_metadata?.needsSelfieUpdate ?? false;

  // Removed Profile Completion Gate. Handled by global persistent Modal now.

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
