import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

const remarkSchema = z.object({
  content: z.string().min(1, "Remark content is required"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized. Admin or Manager access required.", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const { content } = remarkSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true, role: true },
    });

    if (!targetUser) {
      return errorResponse("User not found", 404);
    }

    const remark = await prisma.remark.create({
      data: {
        userId: id,
        content,
        createdBy: session.user.id, // Store ID of manager/admin who created it
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "REMARK_ADDED",
      entity: "USER",
      entityId: id,
      newValues: {
        description: `Added remark to user ${targetUser.email}`
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(remark);
  } catch (error: any) {
    console.error("[POST /api/users/[id]/remarks]", error);
    if (error.name === "ZodError") {
      return errorResponse("Invalid input data", 400);
    }
    return errorResponse("Internal server error", 500);
  }
}
