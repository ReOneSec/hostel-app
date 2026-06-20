import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    // Role-based filtering:
    // SUPER_ADMIN sees all
    // HOSTEL_MANAGER sees only their assigned hostels
    // MONTHLY_MANAGER sees only their assigned hostels
    
    let whereClause: any = {};
    if (session.user.role !== "SUPER_ADMIN") {
      whereClause = { managerAssignments: { some: { userId: session.user.id, isActive: true } } };
    }

    const hostels = await prisma.hostel.findMany({
      where: whereClause,
      include: {
        manager: {
          select: { id: true, username: true, studentProfile: { select: { fullName: true } } }
        },
        _count: {
          select: { rooms: true, hostelAssignments: { where: { status: "ACTIVE" } } }
        }
      },
      orderBy: { name: "asc" }
    });

    return successResponse(hostels);
  } catch (error) {
    console.error("[Hostels GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

const createHostelSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  totalCapacity: z.number().int().min(0),
  managerId: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const body = await req.json();
    const data = createHostelSchema.parse(body);

    const hostel = await prisma.hostel.create({
      data: {
        name: data.name,
        address: data.address,
        contactNumber: data.contactNumber,
        totalCapacity: data.totalCapacity,
        managerId: data.managerId || null,
        createdBy: session.user.id,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "HOSTEL_CREATED",
      entity: "Hostel",
      entityId: hostel.id,
      newValues: { ...hostel },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(hostel, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Validation error", 400);
    }
    console.error("[Hostels POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
