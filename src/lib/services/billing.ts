import { prisma } from "@/lib/prisma";
import type { Session } from "@/lib/auth";

export async function getHostelsForUser(session: Session) {
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

  return hostels;
}

export async function getBillingConfig(hostelId: string) {
  // Run all 5 independent queries in parallel
  const [rentConfigs, establishmentFees, bedFees, activeStudents, rooms] = await Promise.all([
    prisma.rentConfig.findMany({
      where: { hostelId, effectiveTo: null },
      include: {
        user: {
          select: { id: true, username: true, studentProfile: { select: { fullName: true } } }
        }
      }
    }),
    prisma.establishmentFee.findMany({
      where: { hostelId, effectiveTo: null }
    }),
    prisma.bedFee.findMany({
      where: { hostelId, effectiveTo: null },
      include: {
        room: { select: { roomNumber: true } },
        bed: { select: { bedLabel: true } }
      }
    }),
    prisma.hostelAssignment.findMany({
      where: { hostelId, status: "ACTIVE" },
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
      }
    }),
    prisma.room.findMany({
      where: { hostelId, isActive: true },
      include: { beds: { where: { isActive: true } } }
    })
  ]);

  return {
    rentConfigs,
    establishmentFees,
    bedFees,
    activeStudents: activeStudents.map(a => a.user),
    rooms
  };
}

export async function getBillingRegister(hostelId: string, year: number) {
  // Fetch assignments and rent configs in parallel
  const [assignments, allRentConfigs] = await Promise.all([
    prisma.hostelAssignment.findMany({
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
    }),
    prisma.rentConfig.findMany({
      where: { hostelId, effectiveTo: null }
    })
  ]);

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

  // Build rent map from already-fetched data (filter in JS, not another query)
  const rentMap = new Map<string, number>();
  for (const r of allRentConfigs) {
    if (userIds.includes(r.userId)) {
      rentMap.set(r.userId, Number(r.amount));
    }
  }

  // Only need bills query now (rent configs already fetched above)
  const allBills = await prisma.bill.findMany({
    where: { hostelId, userId: { in: userIds } }
  });

  const result = [];
  for (const u of usersMap.values()) {
    const userBills = allBills.filter(b => b.userId === u.id);
    const yearBills = userBills.filter(b => b.year === year);

    const bedFeeBill = yearBills.find(b => Number(b.bedFee) > 0);
    const bedFee = {
      id: bedFeeBill ? bedFeeBill.id : null,
      amount: bedFeeBill ? Number(bedFeeBill.bedFee) : 0,
      status: bedFeeBill ? bedFeeBill.status : "NOT_BILLED"
    };

    const estFeeBill = userBills.find(b => Number(b.establishmentFee) > 0);
    const estFee = {
      id: estFeeBill ? estFeeBill.id : null,
      amount: estFeeBill ? Number(estFeeBill.establishmentFee) : 0,
      status: estFeeBill ? estFeeBill.status : "NOT_BILLED"
    };

    const monthly: Record<number, any> = {};
    for (let m = 1; m <= 12; m++) {
      const b = yearBills.find(x => x.month === m);
      if (b) {
        monthly[m] = {
          id: b.id,
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

  result.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime();
  });

  return result;
}
