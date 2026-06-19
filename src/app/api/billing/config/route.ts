import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");

    if (!hostelId) {
      return NextResponse.json({ error: "hostelId is required" }, { status: 400 });
    }

    // Fetch active RentConfigs for students in this hostel
    const rentConfigs = await prisma.rentConfig.findMany({
      where: { 
        hostelId,
        effectiveTo: null // Active rents
      },
      include: {
        user: {
          select: { username: true, studentProfile: { select: { fullName: true } } }
        }
      }
    });

    // Fetch active Establishment Fees for this hostel
    const establishmentFees = await prisma.establishmentFee.findMany({
      where: {
        hostelId,
        effectiveTo: null
      }
    });

    // Fetch active Bed Fees for this hostel
    const bedFees = await prisma.bedFee.findMany({
      where: {
        hostelId,
        effectiveTo: null
      },
      include: {
        room: { select: { roomNumber: true } },
        bed: { select: { bedLabel: true } }
      }
    });

    // Also fetch the students who are currently assigned to this hostel so we can configure them
    const activeStudents = await prisma.hostelAssignment.findMany({
      where: {
        hostelId,
        status: "ACTIVE"
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            studentProfile: { select: { fullName: true } },
            bedAssignments: {
              where: { status: "ACTIVE" },
              include: { 
                bed: { 
                  include: { room: true } 
                } 
              }
            }
          }
        }
      }
    });

    // Also fetch rooms and beds for the bed fee configuration
    const rooms = await prisma.room.findMany({
      where: { hostelId, isActive: true },
      include: { beds: { where: { isActive: true } } }
    });

    return NextResponse.json({
      data: {
        rentConfigs,
        establishmentFees,
        bedFees,
        activeStudents: activeStudents.map(a => a.user),
        rooms
      }
    });
  } catch (error: any) {
    console.error("Error fetching billing config:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing configuration" },
      { status: 500 }
    );
  }
}
