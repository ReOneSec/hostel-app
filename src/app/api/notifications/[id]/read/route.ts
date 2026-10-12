import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return errorResponse("Notification not found", 404, "NOT_FOUND");
    }

    if (notification.userId !== session.user.id) {
      return errorResponse("Forbidden", 403, "FORBIDDEN");
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("[Notification Read PATCH]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
