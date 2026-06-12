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
    if (!session?.user?.id) return errorResponse("Unauthorized", 401);

    const { id: hostelId } = await params;

    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId },
      include: {
        rooms: {
          include: {
            beds: {
              include: {
                bedAssignments: {
                  where: { status: "ACTIVE" }
                }
              }
            }
          }
        }
      }
    });

    if (!hostel) return errorResponse("Hostel not found", 404);

    let totalBeds = 0;
    let occupiedBeds = 0;

    for (const room of hostel.rooms) {
      totalBeds += room.beds.length;
      for (const bed of room.beds) {
        if (bed.bedAssignments.length > 0) {
          occupiedBeds += 1;
        }
      }
    }

    const vacantBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

    return successResponse({
      hostelId: hostel.id,
      totalCapacity: hostel.totalCapacity,
      totalRooms: hostel.rooms.length,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      occupancyRate: Math.round(occupancyRate * 10) / 10, // 1 decimal place
    });
  } catch (error) {
    console.error("[Hostel Occupancy GET]", error);
    return errorResponse("Internal server error", 500);
  }
}
