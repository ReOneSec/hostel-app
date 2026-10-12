import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const id = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        isFirstLogin: true,
        isProfileComplete: true,
        needsSelfieUpdate: true,
        privacyConsentAt: true,
        studentProfile: {
          select: {
            fullName: true,
            mobile: true,
            emergencyContact: true,
            bloodGroup: true,
            gender: true,
            permanentAddress: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse("User not found", 404, "NOT_FOUND");
    }

    return successResponse(user);
  } catch (error) {
    console.error("[Auth Me GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
