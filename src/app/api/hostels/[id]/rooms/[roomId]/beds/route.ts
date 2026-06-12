import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const { roomId } = await params;

    const beds = await prisma.bed.findMany({
      where: { roomId },
      include: {
        bedAssignments: {
          where: { status: "ACTIVE" },
          include: { user: { select: { id: true, studentProfile: { select: { fullName: true } } } } }
        }
      },
      orderBy: { bedLabel: "asc" }
    });

    return successResponse(beds);
  } catch (error) {
    console.error("[Beds GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

const createBedSchema = z.object({
  bedLabel: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !["SUPER_ADMIN", "HOSTEL_MANAGER"].includes(session.user.role)) {
      return errorResponse("Unauthorized", 403);
    }

    const { roomId } = await params;
    const body = await req.json();
    const data = createBedSchema.parse(body);

    const existingBed = await prisma.bed.findUnique({
      where: {
        roomId_bedLabel: { roomId, bedLabel: data.bedLabel }
      }
    });

    if (existingBed) {
      return errorResponse(`Bed label ${data.bedLabel} already exists in this room`, 400);
    }

    const bed = await prisma.bed.create({
      data: {
        ...data,
        roomId,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "BED_CREATED",
      entity: "Bed",
      entityId: bed.id,
      newValues: { ...bed },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(bed, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation error", 400);
    console.error("[Beds POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
