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

    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");

    const whereHostel = hostelId ? { id: hostelId, isActive: true } : { isActive: true };

    const hostels = await prisma.hostel.findMany({
      where: whereHostel,
      include: {
        rooms: {
          where: { isActive: true },
          include: {
            beds: {
              where: { isActive: true },
              include: {
                bedAssignments: {
                  where: { status: "ACTIVE" },
                  select: { id: true, userId: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const report = hostels.map((hostel) => {
      const rooms = hostel.rooms.map((room) => {
        const totalBeds = room.beds.length;
        const occupiedBeds = room.beds.filter((b) => b.bedAssignments.length > 0).length;
        return {
          roomId: room.id,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          totalBeds,
          occupiedBeds,
          vacantBeds: totalBeds - occupiedBeds,
        };
      });

      const totalBeds = rooms.reduce((s, r) => s + r.totalBeds, 0);
      const occupiedBeds = rooms.reduce((s, r) => s + r.occupiedBeds, 0);

      return {
        hostelId: hostel.id,
        hostelName: hostel.name,
        totalBeds,
        occupiedBeds,
        vacantBeds: totalBeds - occupiedBeds,
        occupancyPercent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        rooms,
      };
    });

    const totals = {
      totalBeds: report.reduce((s, h) => s + h.totalBeds, 0),
      occupiedBeds: report.reduce((s, h) => s + h.occupiedBeds, 0),
      vacantBeds: report.reduce((s, h) => s + h.vacantBeds, 0),
      occupancyPercent: 0 as number,
    };
    totals.occupancyPercent = totals.totalBeds > 0 ? Math.round((totals.occupiedBeds / totals.totalBeds) * 100) : 0;

    return successResponse({ totals, hostels: report });
  } catch (error) {
    console.error("[Reports Occupancy]", error);
    return errorResponse("Internal server error", 500);
  }
}
