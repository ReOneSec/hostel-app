import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { unstable_cache } from "next/cache";

async function fetchOccupancyReport(hostelId: string | null) {
  const whereHostel = hostelId ? { id: hostelId, isActive: true } : { isActive: true };

  // FIX 6: Project only what's rendered with select instead of full include
  const hostels = await prisma.hostel.findMany({
    where: whereHostel,
    select: {
      id: true,
      name: true,
      rooms: {
        where: { isActive: true },
        select: {
          id: true,
          roomNumber: true,
          previousRoomNumber: true,
          roomType: true,
          beds: {
            where: { isActive: true },
            select: {
              id: true,
              bedLabel: true,
              bedAssignments: {
                where: { status: "ACTIVE" },
                select: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      email: true,
                      studentProfile: { select: { fullName: true } },
                    },
                  },
                },
              },
            },
            orderBy: { bedLabel: "asc" },
          },
          roomAssignments: {
            where: { status: "ACTIVE" },
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  studentProfile: { select: { fullName: true } },
                },
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

      const occupantsMap = new Map<string, { id: string; name: string; bedLabel?: string; email?: string }>();
      room.beds.forEach((b) => {
        b.bedAssignments.forEach((ba) => {
          if (ba.user) {
            const name = ba.user.studentProfile?.fullName?.trim() || ba.user.username?.trim() || "Student";
            occupantsMap.set(ba.user.id, {
              id: ba.user.id,
              name,
              bedLabel: b.bedLabel || undefined,
              email: ba.user.email || undefined,
            });
          }
        });
      });

      room.roomAssignments?.forEach((ra) => {
        if (ra.user && !occupantsMap.has(ra.user.id)) {
          const name = ra.user.studentProfile?.fullName?.trim() || ra.user.username?.trim() || "Student";
          occupantsMap.set(ra.user.id, {
            id: ra.user.id,
            name,
            email: ra.user.email || undefined,
          });
        }
      });

      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        previousRoomNumber: room.previousRoomNumber,
        roomType: room.roomType,
        totalBeds,
        occupiedBeds,
        vacantBeds: totalBeds - occupiedBeds,
        occupants: Array.from(occupantsMap.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
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

  return { totals, hostels: report };
}

const getCachedOccupancyReport = (hostelId: string | null) => {
  if (process.env.NODE_ENV === "test") {
    return fetchOccupancyReport(hostelId);
  }
  return unstable_cache(
    () => fetchOccupancyReport(hostelId),
    [`report-occupancy-${hostelId || "all"}`],
    {
      revalidate: 60,
      tags: ["report-occupancy", "dashboard-stats"],
    }
  )();
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized", 403);
    }

    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");

    const data = await getCachedOccupancyReport(hostelId);
    return successResponse(data);
  } catch (error) {
    console.error("[Reports Occupancy]", error);
    return errorResponse("Internal server error", 500);
  }
}
