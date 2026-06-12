import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    const hostel = await prisma.hostel.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, username: true, email: true, studentProfile: { select: { fullName: true } } }
        },
        rooms: {
          include: {
            _count: { select: { beds: true } }
          },
          orderBy: { roomNumber: "asc" }
        }
      }
    });

    if (!hostel) return errorResponse("Hostel not found", 404);

    return successResponse(hostel);
  } catch (error) {
    console.error("[Hostel GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

const updateHostelSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  totalCapacity: z.number().int().min(0).optional(),
  managerId: z.string().uuid().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const data = updateHostelSchema.parse(body);

    const oldHostel = await prisma.hostel.findUnique({ where: { id } });
    if (!oldHostel) return errorResponse("Hostel not found", 404);

    const updatedHostel = await prisma.hostel.update({
      where: { id },
      data,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "HOSTEL_UPDATED",
      entity: "Hostel",
      entityId: id,
      oldValues: { ...oldHostel },
      newValues: { ...updatedHostel },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(updatedHostel);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation error", 400);
    console.error("[Hostel PATCH]", error);
    return errorResponse("Internal server error", 500);
  }
}
