import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

const assignSchema = z.object({
  hostelId: z.string().cuid(),
  roomId: z.string().cuid(),
  bedId: z.string().cuid(),
  notes: z.string().optional(),
  joinedDate: z.string().optional(),
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
    const data = assignSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "STUDENT") {
      return errorResponse("User not found or not a student", 404);
    }

    // Check if bed is already occupied
    const activeBedAssignment = await prisma.bedAssignment.findFirst({
      where: {
        bedId: data.bedId,
        status: "ACTIVE",
      }
    });

    if (activeBedAssignment) {
      return errorResponse("This bed is already occupied", 400);
    }

    // Check if user already has an active assignment
    const existingAssignment = await prisma.hostelAssignment.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      }
    });

    if (existingAssignment) {
      return errorResponse("Student already has an active assignment. Use the transfer endpoint instead.", 400);
    }

    // Use custom join date if provided, otherwise default to now
    const assignedDate = data.joinedDate ? new Date(data.joinedDate) : new Date();

    // Transaction for assignment
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Hostel Assignment
      const hostelAssignment = await tx.hostelAssignment.create({
        data: {
          userId,
          hostelId: data.hostelId,
          assignedAt: assignedDate,
          assignedBy: session.user.id,
          status: "ACTIVE",
          notes: data.notes,
        }
      });

      // 2. Create Room Assignment
      const roomAssignment = await tx.roomAssignment.create({
        data: {
          userId,
          roomId: data.roomId,
          assignedAt: assignedDate,
          assignedBy: session.user.id,
          status: "ACTIVE",
        }
      });

      // 3. Create Bed Assignment
      const bedAssignment = await tx.bedAssignment.create({
        data: {
          userId,
          bedId: data.bedId,
          assignedAt: assignedDate,
          assignedBy: session.user.id,
          status: "ACTIVE",
        }
      });

      // 4. Create Lifecycle Event
      await tx.lifecycleEvent.create({
        data: {
          userId,
          eventType: "JOINED",
          eventDate: assignedDate,
          hostelId: data.hostelId,
          recordedBy: session.user.id,
          notes: data.notes,
        }
      });

      return { hostelAssignment, roomAssignment, bedAssignment };
    });

    await createAuditLog({
      userId: session.user.id,
      action: "STUDENT_ASSIGNED",
      entity: "User",
      entityId: userId,
      newValues: {
        hostelId: data.hostelId,
        roomId: data.roomId,
        bedId: data.bedId,
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }
    console.error("[Assign POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
