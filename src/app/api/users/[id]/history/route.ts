import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }
    
    const { id } = await params;

    // SUPER_ADMIN can view anyone. HOSTEL_MANAGER can only view students. STUDENT can view themselves.
    if (session.user.role === "STUDENT" && session.user.id !== id) {
      return errorResponse("Forbidden", 403);
    }

    const events = await prisma.lifecycleEvent.findMany({
      where: { userId: id },
      orderBy: { eventDate: "desc" },
      include: {
        fromHostel: { select: { id: true, name: true } },
        toHostel: { select: { id: true, name: true } },
      }
    });

    const historicalAssignments = await prisma.hostelAssignment.findMany({
      where: { userId: id },
      orderBy: { assignedAt: "desc" },
      include: {
        hostel: { select: { id: true, name: true } },
      }
    });

    return successResponse({
      lifecycleEvents: events,
      assignments: historicalAssignments,
    });
  } catch (error) {
    console.error("[History GET]", error);
    return errorResponse("Internal server error", 500);
  }
}
