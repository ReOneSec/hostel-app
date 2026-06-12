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

    const pendingRequest = await prisma.profileEditRequest.findFirst({
      where: {
        userId: session.user.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(pendingRequest);
  } catch (error) {
    console.error("[Profile Edit Request GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    
    // Validate we don't already have a pending request
    const existingPending = await prisma.profileEditRequest.findFirst({
      where: {
        userId: session.user.id,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return errorResponse("You already have a pending profile edit request.", 400);
    }

    const editRequest = await prisma.profileEditRequest.create({
      data: {
        userId: session.user.id,
        requestedChanges: body,
        status: "PENDING",
      },
    });

    return successResponse(editRequest, 201);
  } catch (error) {
    console.error("[Profile Edit Request POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
