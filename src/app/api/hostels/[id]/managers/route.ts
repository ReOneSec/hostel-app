import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { createAdminClient } from "@/utils/supabase/admin";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const { id } = await params;

    const assignments = await prisma.hostelManagerAssignment.findMany({
      where: { hostelId: id },
      orderBy: { assignedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            studentProfile: { select: { fullName: true } }
          }
        }
      }
    });

    return successResponse(assignments);
  } catch (error) {
    console.error("[HostelManagers GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

const assignManagerSchema = z.object({
  userId: z.string().cuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const { userId } = assignManagerSchema.parse(body);

    const hostel = await prisma.hostel.findUnique({ where: { id } });
    if (!hostel) return errorResponse("Hostel not found", 404);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return errorResponse("User not found", 404);

    // Find old active managers BEFORE deactivating them (so we can downgrade their roles)
    const oldActiveManagers = await prisma.hostelManagerAssignment.findMany({
      where: { hostelId: id, isActive: true },
      include: { user: true }
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark existing active managers for this hostel as inactive
      await tx.hostelManagerAssignment.updateMany({
        where: { hostelId: id, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revokedBy: session.user.id }
      });

      // 2. Downgrade old managers' roles back to STUDENT
      // (only if they have no other active manager assignments elsewhere)
      for (const oldAssignment of oldActiveManagers) {
        if (oldAssignment.userId === userId) continue; // skip if re-assigning same user
        if (oldAssignment.user.role === "SUPER_ADMIN") continue; // never downgrade super admins

        const otherActiveAssignments = await tx.hostelManagerAssignment.count({
          where: {
            userId: oldAssignment.userId,
            isActive: true,
            hostelId: { not: id } // assignments on OTHER hostels
          }
        });

        if (otherActiveAssignments === 0) {
          await tx.user.update({
            where: { id: oldAssignment.userId },
            data: { role: "STUDENT" }
          });
        }
      }

      // 3. Create new assignment
      const newAssignment = await tx.hostelManagerAssignment.create({
        data: {
          userId,
          hostelId: id,
          assignedBy: session.user.id,
          isActive: true
        }
      });

      // 4. Update hostel's managerId reference
      await tx.hostel.update({
        where: { id },
        data: { managerId: userId }
      });

      // 5. Update the new user's role to HOSTEL_MANAGER
      // Don't downgrade a SUPER_ADMIN
      if (user.role !== "SUPER_ADMIN") {
        await tx.user.update({
          where: { id: userId },
          data: { role: "HOSTEL_MANAGER" }
        });
      }

      return newAssignment;
    });

    // 6. Sync Supabase Auth metadata for all affected users
    try {
      const supabaseAdmin = createAdminClient();
      const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers();

      // Downgrade old managers in Supabase
      for (const oldAssignment of oldActiveManagers) {
        if (oldAssignment.userId === userId) continue;
        if (oldAssignment.user.role === "SUPER_ADMIN") continue;

        const otherActive = await prisma.hostelManagerAssignment.count({
          where: { userId: oldAssignment.userId, isActive: true }
        });

        if (otherActive === 0) {
          const authUser = allAuthUsers.find((u: any) => u.email === oldAssignment.user.email);
          if (authUser) {
            await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
              user_metadata: { ...authUser.user_metadata, role: "STUDENT" },
              app_metadata: { role: "STUDENT" }
            });
          }
        }
      }

      // Promote new manager in Supabase
      if (user.role !== "SUPER_ADMIN") {
        const authUser = allAuthUsers.find((u: any) => u.email === user.email);
        if (authUser) {
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            user_metadata: { ...authUser.user_metadata, role: "HOSTEL_MANAGER" },
            app_metadata: { role: "HOSTEL_MANAGER" }
          });
        }
      }
    } catch (err) {
      console.error("Failed to update Supabase metadata", err);
    }

    await createAuditLog({
      userId: session.user.id,
      action: "HOSTEL_MANAGER_ASSIGNED",
      entity: "Hostel",
      entityId: id,
      newValues: { managerId: userId },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation error", 400);
    console.error("[HostelManagers POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
