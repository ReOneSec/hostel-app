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

    const { id: hostelId, roomId } = await params;

    const room = await prisma.room.findUnique({
      where: { id: roomId, hostelId }
    });

    if (!room) return errorResponse("Room not found", 404);

    return successResponse(room);
  } catch (error) {
    console.error("[Room GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

const updateRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room name/number is required").optional(),
  type: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "DORMITORY"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !["SUPER_ADMIN", "HOSTEL_MANAGER"].includes(session.user.role)) {
      return errorResponse("Unauthorized", 403);
    }

    const { id: hostelId, roomId } = await params;
    const body = await req.json();
    const data = updateRoomSchema.parse(body);

    const room = await prisma.room.findUnique({
      where: { id: roomId, hostelId }
    });

    if (!room) return errorResponse("Room not found", 404);

    if (data.roomNumber && data.roomNumber !== room.roomNumber) {
      const existingRoom = await prisma.room.findUnique({
        where: {
          hostelId_roomNumber: { hostelId, roomNumber: data.roomNumber }
        }
      });

      if (existingRoom) {
        return errorResponse(`Room ${data.roomNumber} already exists in this hostel`, 400);
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        roomNumber: data.roomNumber !== undefined ? data.roomNumber : undefined,
        roomType: data.type !== undefined ? data.type : undefined,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "ROOM_UPDATED",
      entity: "Room",
      entityId: updatedRoom.id,
      oldValues: { ...room },
      newValues: { ...updatedRoom },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(updatedRoom);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation error", 400);
    console.error("[Room PATCH]", error);
    return errorResponse("Internal server error", 500);
  }
}
