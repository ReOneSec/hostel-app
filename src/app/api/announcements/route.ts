import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  getMineAnnouncements,
  composeAnnouncement,
  getSentAnnouncements,
} from "@/lib/services/announcements";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getIpAddress, getUserAgent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");
    const audience = searchParams.get("audience");
    const hostelId = searchParams.get("hostelId");
    const includeExpired = searchParams.get("includeExpired") === "true";

    if (scope === "mine") {
      const data = await getMineAnnouncements({
        userId: session.user.id,
        role: session.user.role,
        previewAudience: audience,
        previewHostelId: hostelId,
        includeExpired,
      });
      return successResponse(data);
    }

    // If admin or manager requesting sent announcements list
    if (session.user.role === "STUDENT") {
      return errorResponse("Forbidden", 403, "FORBIDDEN");
    }

    const search = searchParams.get("search");
    const sent = await getSentAnnouncements({
      senderId: session.user.id,
      senderRole: session.user.role,
      audience,
      search,
    });

    return successResponse(sent);
  } catch (error: any) {
    if (error?.message === "FORBIDDEN") {
      return errorResponse("Forbidden", 403, "FORBIDDEN");
    }
    console.error("[Announcements GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (session.user.role === "STUDENT") {
      return errorResponse("Forbidden", 403, "FORBIDDEN");
    }

    // Rate limit: 30/hour per sender
    const rateCheck = checkRateLimit(session.user.id, "announcements_compose");
    if (!rateCheck.success) {
      return errorResponse("Rate limit exceeded. Maximum 30 notices per hour.", 429, "RATE_LIMITED");
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON payload", 400, "VALIDATION_ERROR");
    }

    const announcement = await composeAnnouncement({
      senderId: session.user.id,
      senderRole: session.user.role,
      data: body,
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(announcement, 201);
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg.startsWith("VALIDATION_ERROR")) {
      const detail = msg.replace("VALIDATION_ERROR:", "").trim();
      return errorResponse(detail || "Validation error", 400, "VALIDATION_ERROR");
    }
    if (msg.startsWith("FORBIDDEN")) {
      const detail = msg.replace("FORBIDDEN:", "").trim();
      return errorResponse(detail || "Forbidden", 403, "FORBIDDEN");
    }
    console.error("[Announcements POST]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
