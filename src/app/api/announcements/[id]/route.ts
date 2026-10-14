import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { updateAnnouncement, deleteAnnouncement } from "@/lib/services/announcements";
import { getIpAddress, getUserAgent } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id: announcementId } = await params;

    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON payload", 400, "VALIDATION_ERROR");
    }

    const updated = await updateAnnouncement({
      announcementId,
      senderId: session.user.id,
      senderRole: session.user.role,
      data: body,
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(updated);
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg === "NOT_FOUND") {
      return errorResponse("Announcement not found", 404, "NOT_FOUND");
    }
    if (msg.startsWith("VALIDATION_ERROR")) {
      const detail = msg.replace("VALIDATION_ERROR:", "").trim();
      return errorResponse(detail || "Validation error", 400, "VALIDATION_ERROR");
    }
    if (msg.startsWith("FORBIDDEN")) {
      const detail = msg.replace("FORBIDDEN:", "").trim();
      return errorResponse(detail || "Forbidden", 403, "FORBIDDEN");
    }
    console.error("[Announcement PATCH]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id: announcementId } = await params;

    await deleteAnnouncement({
      announcementId,
      senderId: session.user.id,
      senderRole: session.user.role,
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse({ deleted: true });
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg === "NOT_FOUND") {
      return errorResponse("Announcement not found", 404, "NOT_FOUND");
    }
    if (msg.startsWith("FORBIDDEN")) {
      const detail = msg.replace("FORBIDDEN:", "").trim();
      return errorResponse(detail || "Forbidden", 403, "FORBIDDEN");
    }
    console.error("[Announcement DELETE]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
