import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { createAdminClient } from "@/utils/supabase/admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const { id: hostelId, assignmentId } = await params;

    const assignment = await prisma.hostelManagerAssignment.findUnique({
      where: { id: assignmentId },
      include: { user: true }
    });

    if (!assignment || assignment.hostelId !== hostelId) {
      return errorResponse("Assignment not found", 404);
    }

    if (!assignment.isActive) {
      return errorResponse("Assignment is already inactive", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark assignment as inactive
      const updatedAssignment = await tx.hostelManagerAssignment.update({
        where: { id: assignmentId },
        data: { isActive: false, revokedAt: new Date(), revokedBy: session.user.id }
      });

      // 2. Remove managerId from hostel if it matches
      const hostel = await tx.hostel.findUnique({ where: { id: hostelId } });
      if (hostel?.managerId === assignment.userId) {
        await tx.hostel.update({
          where: { id: hostelId },
          data: { managerId: null }
        });
      }

      // 3. Downgrade user role to STUDENT (if they are HOSTEL_MANAGER)
      // Check if they are managing any OTHER hostels before downgrading
      const otherActiveAssignments = await tx.hostelManagerAssignment.count({
        where: {
          userId: assignment.userId,
          isActive: true,
          id: { not: assignmentId }
        }
      });

      if (otherActiveAssignments === 0 && assignment.user.role === "HOSTEL_MANAGER") {
        await tx.user.update({
          where: { id: assignment.userId },
          data: { role: "STUDENT" }
        });
      }

      return updatedAssignment;
    });

    // 4. Update Supabase Auth user_metadata
    // Only if they were downgraded
    const otherActiveAssignmentsCheck = await prisma.hostelManagerAssignment.count({
      where: {
        userId: assignment.userId,
        isActive: true
      }
    });

    if (otherActiveAssignmentsCheck === 0 && assignment.user.role === "HOSTEL_MANAGER") {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10000 });
        const authUser = users.find((u: any) => u.email === assignment.user.email);
        if (authUser) {
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            user_metadata: { ...authUser.user_metadata, role: "STUDENT" }
          });
        }
      } catch (err) {
        console.error("Failed to update Supabase metadata", err);
      }
    }

    await createAuditLog({
      userId: session.user.id,
      action: "HOSTEL_MANAGER_REMOVED",
      entity: "Hostel",
      entityId: hostelId,
      oldValues: { managerId: assignment.userId },
      newValues: { managerId: null },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(result, 200);
  } catch (error) {
    console.error("[HostelManagers DELETE]", error);
    return errorResponse("Internal server error", 500);
  }
}
