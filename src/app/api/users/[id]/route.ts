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
    
    let { id } = await params;

    // Support for /api/users/me
    if (id === "me") {
      id = session.user.id;
    }

    // SUPER_ADMIN can view anyone. HOSTEL_MANAGER can only view students (or we can tighten it to students in their hostel later)
    if (session.user.role === "STUDENT" && session.user.id !== id) {
      return errorResponse("Forbidden", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        isProfileComplete: true,
        createdAt: true,
        studentProfile: true, // gets all fields from StudentProfile
        documents: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            fileUrl: true,
            status: true,
            uploadedAt: true,
            rejectionReason: true,
          },
          orderBy: { uploadedAt: "desc" }
        },
        selfies: {
          where: { isCurrent: true },
          select: {
            id: true,
            fileUrl: true,
            capturedAt: true,
            latitude: true,
            longitude: true,
          }
        },
        hostelAssignments: {
          where: { status: "ACTIVE" },
          include: {
            hostel: true,
          }
        },
        roomAssignments: {
          where: { status: "ACTIVE" },
          include: { room: true }
        },
        bedAssignments: {
          where: { status: "ACTIVE" },
          include: { bed: true }
        },
        lifecycleEvents: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            fromHostel: { select: { name: true } },
            toHostel: { select: { name: true } },
          }
        }
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse(user);
  } catch (error) {
    console.error("[User GET]", error);
    return errorResponse("Internal server error", 500);
  }
}
