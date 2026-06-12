import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    // Only SUPER_ADMIN or HOSTEL_MANAGER can change status
    if (!session?.user?.id || !["SUPER_ADMIN", "HOSTEL_MANAGER"].includes(session.user.role)) {
      return errorResponse("Unauthorized", 403);
    }

    const { id: targetUserId } = await params;
    
    // Prevent self-deactivation
    if (session.user.id === targetUserId) {
      return errorResponse("You cannot change your own status", 400);
    }

    const body = await req.json();
    const data = statusSchema.parse(body);

    const currentUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { status: true, role: true }
    });

    if (!currentUser) {
      return errorResponse("User not found", 404);
    }

    // Only SUPER_ADMIN can change the status of another SUPER_ADMIN
    if (currentUser.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Forbidden. Only Super Admins can modify Super Admins.", 403);
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { status: data.status },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "USER_STATUS_CHANGED",
      entity: "User",
      entityId: targetUserId,
      oldValues: { status: currentUser.status },
      newValues: { status: updatedUser.status },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse({ status: updatedUser.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid status value", 400);
    }
    console.error("[User Status PATCH]", error);
    return errorResponse("Internal server error", 500);
  }
}
