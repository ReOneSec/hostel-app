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
    const status = searchParams.get("status"); // ACTIVE or INACTIVE

    const userWhere: any = {
      role: { in: ["STUDENT", "MONTHLY_MANAGER"] },
    };
    if (status) userWhere.status = status;
    if (hostelId) {
      userWhere.hostelAssignments = {
        some: {
          hostelId: hostelId,
          status: "ACTIVE"
        }
      };
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        studentProfile: {
          select: { fullName: true, mobile: true, personalEmail: true },
        },
        hostelAssignments: {
          where: { status: "ACTIVE" },
          select: {
            hostel: { select: { id: true, name: true } },
            assignedAt: true,
          },
          take: 1,
        },
        roomAssignments: {
          where: { status: "ACTIVE" },
          select: { room: { select: { roomNumber: true } } },
          take: 1,
        },
        bedAssignments: {
          where: { status: "ACTIVE" },
          select: { bed: { select: { bedLabel: true } } },
          take: 1,
        },
        lifecycleEvents: {
          where: { eventType: { in: ["TRANSFERRED_IN", "TRANSFERRED_OUT"] } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const students = users.map((u) => ({
      id: u.id,
      name: u.studentProfile?.fullName || "N/A",
      email: u.email,
      personalEmail: u.studentProfile?.personalEmail || null,
      mobile: u.studentProfile?.mobile || null,
      status: u.status,
      hostel: u.hostelAssignments[0]?.hostel.name || "Unassigned",
      hostelId: u.hostelAssignments[0]?.hostel.id || null,
      room: u.roomAssignments[0]?.room.roomNumber || "N/A",
      bed: u.bedAssignments[0]?.bed.bedLabel || "N/A",
      joinedAt: u.hostelAssignments[0]?.assignedAt || u.createdAt,
      transferCount: u.lifecycleEvents.length,
    }));

    const summary = {
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === "ACTIVE").length,
      inactiveStudents: students.filter((s) => s.status !== "ACTIVE").length,
      unassigned: students.filter((s) => s.hostel === "Unassigned").length,
    };

    return successResponse({ summary, students });
  } catch (error) {
    console.error("[Reports Students]", error);
    return errorResponse("Internal server error", 500);
  }
}
