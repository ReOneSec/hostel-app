import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roomId: string; bedId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !["SUPER_ADMIN", "HOSTEL_MANAGER"].includes(session.user.role)) {
      return errorResponse("Unauthorized", 403);
    }

    const { id: hostelId, roomId, bedId } = await params;

    // Verify bed exists and belongs to the specified room and hostel
    const bed = await prisma.bed.findFirst({
      where: {
        id: bedId,
        roomId: roomId,
        room: {
          hostelId: hostelId
        }
      }
    });

    if (!bed) {
      return errorResponse("Bed not found", 404);
    }

    // Check if bed is currently occupied
    const activeAssignments = await prisma.bedAssignment.findFirst({
      where: {
        bedId: bedId,
        status: "ACTIVE"
      }
    });

    if (activeAssignments) {
      return errorResponse("Cannot delete an occupied bed", 400);
    }

    // Delete bed (or soft delete if preferred, but since it's vacant and probably unused we can delete. 
    // However, if it has past assignments, deleting will fail due to foreign key constraints, 
    // so we should check for any assignments and either soft delete or allow if none exist).
    const anyAssignments = await prisma.bedAssignment.count({
      where: { bedId: bedId }
    });

    if (anyAssignments > 0) {
      // Soft delete
      await prisma.bed.update({
        where: { id: bedId },
        data: { isActive: false }
      });
    } else {
      // Hard delete
      // Also delete any bedFees related to it
      await prisma.bedFee.deleteMany({
        where: { bedId: bedId }
      });
      await prisma.bed.delete({
        where: { id: bedId }
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "BED_DELETED",
      entity: "Bed",
      entityId: bed.id,
      oldValues: { ...bed },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse({ success: true, message: "Bed removed successfully" });
  } catch (error) {
    console.error("[Bed DELETE]", error);
    return errorResponse("Internal server error", 500);
  }
}
