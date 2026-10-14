import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { markAnnouncementRead } from "@/lib/services/announcements";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id: announcementId } = await params;

    const result = await markAnnouncementRead({
      announcementId,
      userId: session.user.id,
      userRole: session.user.role,
    });

    return successResponse(result);
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      return errorResponse("Announcement not found", 404, "NOT_FOUND");
    }
    if (error?.message === "FORBIDDEN") {
      return errorResponse("Forbidden", 403, "FORBIDDEN");
    }
    console.error("[Announcement Mark Read POST]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
