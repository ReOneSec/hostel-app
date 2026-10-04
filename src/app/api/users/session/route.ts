import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }
    
    const id = session.user.id;

    // Lightweight query specifically for auth state and route guarding.
    // Avoids massive relation queries (documents, selfies, assignments, etc.)
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
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse(user);
  } catch (error) {
    console.error("[User Session GET]", error);
    return errorResponse("Internal server error", 500);
  }
}
