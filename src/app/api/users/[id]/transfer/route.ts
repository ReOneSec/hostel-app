import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

const transferSchema = z.object({
  newHostelId: z.string().cuid(),
  newRoomId: z.string().cuid(),
  newBedId: z.string().cuid(),
  transferReason: z.string().min(3),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized", 403);
    }
    
    const { id: userId } = await params;
    const body = await req.json();
    const data = transferSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "STUDENT") {
      return errorResponse("User not found or not a student", 404);
    }

    // Get current assignments
    const currentHostelAssignment = await prisma.hostelAssignment.findFirst({
      where: { userId, status: "ACTIVE" }
    });

    if (!currentHostelAssignment) {
      return errorResponse("Student does not have an active assignment. Use the assign endpoint instead.", 400);
    }

    // Check if new bed is already occupied
    const activeBedAssignment = await prisma.bedAssignment.findFirst({
      where: { bedId: data.newBedId, status: "ACTIVE" }
    });

    if (activeBedAssignment) {
      return errorResponse("The selected bed is already occupied", 400);
    }

    const now = new Date();

    // Transaction for transfer
    const result = await prisma.$transaction(async (tx) => {
      // 1. Close old assignments
      await tx.hostelAssignment.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "TRANSFERRED", transferredAt: now, leftAt: now }
      });

      await tx.roomAssignment.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "TRANSFERRED", leftAt: now }
      });

      await tx.bedAssignment.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "TRANSFERRED", leftAt: now }
      });

      // 2. Create new assignments
      const newHostelAssignment = await tx.hostelAssignment.create({
        data: {
          userId,
          hostelId: data.newHostelId,
          assignedBy: session.user.id,
          status: "ACTIVE",
        }
      });

      const newRoomAssignment = await tx.roomAssignment.create({
        data: {
          userId,
          roomId: data.newRoomId,
          assignedBy: session.user.id,
          status: "ACTIVE",
        }
      });

      const newBedAssignment = await tx.bedAssignment.create({
        data: {
          userId,
          bedId: data.newBedId,
          assignedBy: session.user.id,
          status: "ACTIVE",
        }
      });

      // 3. Create Lifecycle Events
      await tx.lifecycleEvent.createMany({
        data: [
          { 
            userId, 
            eventType: "TRANSFERRED_OUT", 
            eventDate: now,
            fromHostelId: currentHostelAssignment.hostelId, 
            toHostelId: data.newHostelId,
            transferReason: data.transferReason,
            recordedBy: session.user.id,
          },
          { 
            userId, 
            eventType: "TRANSFERRED_IN", 
            eventDate: now,
            fromHostelId: currentHostelAssignment.hostelId, 
            toHostelId: data.newHostelId,
            transferReason: data.transferReason,
            recordedBy: session.user.id,
          }
        ]
      });

      // 4. Invalidate old selfies
      await tx.selfie.updateMany({
        where: { userId },
        data: { isCurrent: false }
      });

      // 5. Flag user for new selfie
      await tx.user.update({
        where: { id: userId },
        data: { needsSelfieUpdate: true }
      });

      return { newHostelAssignment, newRoomAssignment, newBedAssignment };
    });

    // Update Supabase Auth metadata
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const supabaseAdmin = createAdminClient();
    
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    const authUser = usersData.users.find(u => u.email === user.email);
    if (authUser) {
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...authUser.user_metadata,
          needsSelfieUpdate: true
        }
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "STUDENT_TRANSFERRED",
      entity: "User",
      entityId: userId,
      oldValues: {
        hostelId: currentHostelAssignment.hostelId,
      },
      newValues: {
        hostelId: data.newHostelId,
        roomId: data.newRoomId,
        bedId: data.newBedId,
        reason: data.transferReason,
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }
    console.error("[Transfer POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
