import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const { id: userId } = await params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return errorResponse("User not found", 404);
    if (user.role === "SUPER_ADMIN") return errorResponse("Cannot downgrade a Super Admin", 400);
    if (user.role === "STUDENT") return errorResponse("User is already a Student", 400);

    const oldRole = user.role;

    // Verify user has no active manager assignments
    const activeHostelAssignments = await prisma.hostelManagerAssignment.count({
      where: { userId, isActive: true }
    });

    if (activeHostelAssignments > 0) {
      return errorResponse("User still has active hostel manager assignments. Remove those first.", 400);
    }

    // Update role in DB
    await prisma.user.update({
      where: { id: userId },
      data: { role: "STUDENT" }
    });

    // Update role in Supabase Auth
    try {
      const supabaseAdmin = createAdminClient();
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = users.find((u: any) => u.email === user.email);
      if (authUser) {
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          user_metadata: { ...authUser.user_metadata, role: "STUDENT" }
        });
      }
    } catch (err) {
      console.error("Failed to update Supabase metadata", err);
    }

    await createAuditLog({
      userId: session.user.id,
      action: "USER_ROLE_DOWNGRADED",
      entity: "User",
      entityId: userId,
      oldValues: { role: oldRole },
      newValues: { role: "STUDENT" },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse({ userId, newRole: "STUDENT" });
  } catch (error) {
    console.error("[User Downgrade POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
