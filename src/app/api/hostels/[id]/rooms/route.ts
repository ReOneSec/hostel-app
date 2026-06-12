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

    const { id: hostelId } = await params;

    const rooms = await prisma.room.findMany({
      where: { hostelId },
      include: {
        beds: true,
        _count: {
          select: {
            roomAssignments: { where: { status: "ACTIVE" } }
          }
        }
      },
      orderBy: { roomNumber: "asc" }
    });

    return successResponse(rooms);
  } catch (error) {
    console.error("[Rooms GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

const createRoomSchema = z.object({
  roomNumber: z.string().min(1),
  type: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "DORMITORY"]),
  floor: z.number().int().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !["SUPER_ADMIN", "HOSTEL_MANAGER"].includes(session.user.role)) {
      return errorResponse("Unauthorized", 403);
    }

    const { id: hostelId } = await params;
    const body = await req.json();
    const data = createRoomSchema.parse(body);

    const existingRoom = await prisma.room.findUnique({
      where: {
        hostelId_roomNumber: { hostelId, roomNumber: data.roomNumber }
      }
    });

    if (existingRoom) {
      return errorResponse(`Room ${data.roomNumber} already exists in this hostel`, 400);
    }

    const room = await prisma.room.create({
      data: {
        roomNumber: data.roomNumber,
        roomType: data.type,
        hostelId,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "ROOM_CREATED",
      entity: "Room",
      entityId: room.id,
      newValues: { ...room },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(room, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation error", 400);
    console.error("[Rooms POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
