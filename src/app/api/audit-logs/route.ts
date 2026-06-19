import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    // Only SUPER_ADMIN and HOSTEL_MANAGER can view audit logs. 
    // Wait, the plan says admin user management. I'll let SUPER_ADMIN and HOSTEL_MANAGER view them.
    if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized. Admin or Manager access required.", 403);
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const entity = searchParams.get("entity");
    const entityId = searchParams.get("entityId");
    
    // Pagination (Simple limit for now)
    const limit = 200;

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;

    const logs = await prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { timestamp: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      }
    });

    return successResponse(logs);
  } catch (error) {
    console.error("[AuditLogs GET]", error);
    return errorResponse("Internal server error", 500);
  }
}
