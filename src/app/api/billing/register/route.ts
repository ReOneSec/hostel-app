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
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    if (!hostelId) {
      return NextResponse.json({ error: "hostelId is required" }, { status: 400 });
    }

    // Get all assignments to figure out when they joined and left this specific hostel
    const assignments = await prisma.hostelAssignment.findMany({
      where: { hostelId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            studentProfile: { select: { fullName: true } },
            bedAssignments: {
              where: { status: "ACTIVE" },
              include: { bed: { include: { room: true } } }
            }
          }
        }
      },
      orderBy: { assignedAt: 'asc' }
    });

    type UserRegisterData = {
      id: string;
      name: string;
      username: string;
      studentProfile: any;
      bedAssignments: any[];
      joiningDate: Date;
      leftDate: Date | null;
      isActive: boolean;
    };

    const usersMap = new Map<string, UserRegisterData>();
    for (const a of assignments) {
      if (!usersMap.has(a.userId)) {
        usersMap.set(a.userId, {
          id: a.userId,
          name: a.user.studentProfile?.fullName || a.user.username,
          username: a.user.username,
          studentProfile: a.user.studentProfile,
          bedAssignments: a.user.bedAssignments,
          joiningDate: a.assignedAt,
          leftDate: a.status !== "ACTIVE" ? a.leftAt : null,
          isActive: a.status === "ACTIVE"
        });
      } else {
        const u = usersMap.get(a.userId)!;
        if (a.assignedAt < u.joiningDate) u.joiningDate = a.assignedAt;
        if (a.status === "ACTIVE") {
          u.leftDate = null;
          u.isActive = true;
        } else if (!u.isActive) {
          if (!u.leftDate || (a.leftAt && a.leftAt > u.leftDate)) {
            u.leftDate = a.leftAt;
          }
        }
      }
    }

    const userIds = Array.from(usersMap.keys());

    // Get current active rent configs
    const rentConfigs = await prisma.rentConfig.findMany({
      where: {
        hostelId,
        userId: { in: userIds },
        effectiveTo: null
      }
    });
    const rentMap = new Map<string, number>();
    for (const r of rentConfigs) {
      rentMap.set(r.userId, Number(r.amount));
    }

    // Get all bills for these users in this hostel
    const allBills = await prisma.bill.findMany({
      where: {
        hostelId,
        userId: { in: userIds }
      }
    });

    // Determine statuses
    const result = [];
    for (const u of usersMap.values()) {
      const userBills = allBills.filter(b => b.userId === u.id);
      const yearBills = userBills.filter(b => b.year === year);

      // Bed Fee (for THIS year)
      const bedFeeBill = yearBills.find(b => Number(b.bedFee) > 0);
      const bedFee = {
        amount: bedFeeBill ? Number(bedFeeBill.bedFee) : 0,
        status: bedFeeBill ? bedFeeBill.status : "NOT_BILLED"
      };

      // Est Fee (ANY year)
      const estFeeBill = userBills.find(b => Number(b.establishmentFee) > 0);
      const estFee = {
        amount: estFeeBill ? Number(estFeeBill.establishmentFee) : 0,
        status: estFeeBill ? estFeeBill.status : "NOT_BILLED"
      };

      type MonthRecord = { amount: number; totalAmount: number; status: string } | null;
      const monthly: Record<number, MonthRecord> = {};
      for (let m = 1; m <= 12; m++) {
        const b = yearBills.find(x => x.month === m);
        if (b) {
          monthly[m] = {
            amount: Number(b.rentAmount),
            totalAmount: Number(b.totalAmount),
            status: b.status
          };
        } else {
          monthly[m] = null;
        }
      }

      result.push({
        ...u,
        baseRent: rentMap.get(u.id) || 0,
        bedFee,
        estFee,
        monthly
      });
    }

    // Sort by active first, then joining date
    result.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime();
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Error fetching register data:", error);
    return NextResponse.json(
      { error: "Failed to fetch register data" },
      { status: 500 }
    );
  }
}
