import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized", 403);
    }

    const requests = await prisma.profileEditRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            email: true,
            username: true,
            studentProfile: true,
          }
        },
        reviewer: {
          select: {
            username: true,
          }
        }
      }
    });

    return successResponse(requests);
  } catch (error) {
    console.error("[Admin Profile Requests GET]", error);
    return errorResponse("Internal server error", 500);
  }
}
