import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

const updateDateSchema = z.object({
  joiningDate: z.string().datetime().nullable(),
});

export async function PATCH(
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
    const { joiningDate } = updateDateSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true, role: true },
    });

    if (!targetUser) {
      return errorResponse("User not found", 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { joiningDate },
    });

    await createAuditLog({
      action: "JOINING_DATE_UPDATED",
      entityType: "USER",
      entityId: id,
      actorId: session.user.id,
      description: `Updated joining date for user ${targetUser.email}`,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    return successResponse({ joiningDate: updatedUser.joiningDate });
  } catch (error: any) {
    console.error("[PATCH /api/users/[id]/joining-date]", error);
    if (error.name === "ZodError") {
      return errorResponse("Invalid date format", 400);
    }
    return errorResponse("Internal server error", 500);
  }
}
