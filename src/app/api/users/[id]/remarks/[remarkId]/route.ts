import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

const remarkSchema = z.object({
  content: z.string().min(1, "Remark content is required"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; remarkId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized. Admin or Manager access required.", 403);
    }

    const { id, remarkId } = await params;
    const body = await req.json();
    const { content } = remarkSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true },
    });

    if (!targetUser) {
      return errorResponse("User not found", 404);
    }

    const existingRemark = await prisma.remark.findUnique({
      where: { id: remarkId, userId: id },
    });

    if (!existingRemark) {
      return errorResponse("Remark not found", 404);
    }

    const remark = await prisma.remark.update({
      where: { id: remarkId },
      data: { content },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "REMARK_UPDATED",
      entity: "USER",
      entityId: id,
      newValues: {
        description: `Updated remark for user ${targetUser.email}`
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(remark);
  } catch (error: any) {
    console.error("[PATCH /api/users/[id]/remarks/[remarkId]]", error);
    if (error.name === "ZodError") {
      return errorResponse("Invalid input data", 400);
    }
    return errorResponse("Failed to update remark", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; remarkId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized. Admin or Manager access required.", 403);
    }

    const { id, remarkId } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true },
    });

    if (!targetUser) {
      return errorResponse("User not found", 404);
    }

    const existingRemark = await prisma.remark.findUnique({
      where: { id: remarkId, userId: id },
    });

    if (!existingRemark) {
      return errorResponse("Remark not found", 404);
    }

    await prisma.remark.delete({
      where: { id: remarkId },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "REMARK_DELETED",
      entity: "USER",
      entityId: id,
      newValues: {
        description: `Deleted remark for user ${targetUser.email}`
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse({ message: "Remark deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/users/[id]/remarks/[remarkId]]", error);
    return errorResponse("Failed to delete remark", 500);
  }
}
