import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Session } from "@/lib/auth";

export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "object") {
    if (
      obj instanceof Prisma.Decimal ||
      (typeof (obj as any).toNumber === "function" && typeof (obj as any).toFixed === "function")
    ) {
      return (obj as any).toNumber();
    }
    if (obj instanceof Date) {
      return obj.toISOString() as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map(serializeDecimals) as unknown as T;
    }
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeDecimals((obj as any)[key]);
    }
    return result;
  }
  return obj;
}

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

  return serializeDecimals(hostels);
}

export async function getBillingConfig(hostelId: string) {
  // Run independent queries in parallel
  const [rentConfigs, establishmentFees, bedFees, hostelAssignments, bedAssignmentsInHostel, rooms] = await Promise.all([
    prisma.rentConfig.findMany({
      where: { hostelId, effectiveTo: null },
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
    prisma.bedAssignment.findMany({
      where: {
        status: "ACTIVE",
        bed: { room: { hostelId } }
      },
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

  // Combine and deduplicate users by ID
  const studentsMap = new Map<string, any>();
  for (const ha of hostelAssignments) {
    if (ha.user && !studentsMap.has(ha.user.id)) {
      studentsMap.set(ha.user.id, ha.user);
    }
  }
  for (const ba of bedAssignmentsInHostel) {
    if (ba.user && !studentsMap.has(ba.user.id)) {
      studentsMap.set(ba.user.id, ba.user);
    }
  }

  const activeStudents = Array.from(studentsMap.values());

  // Sort students alphabetically by student name
  activeStudents.sort((a, b) => {
    const nameA = a.studentProfile?.fullName?.trim() || a.username || "";
    const nameB = b.studentProfile?.fullName?.trim() || b.username || "";
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });

  return serializeDecimals({
    rentConfigs,
    establishmentFees,
    bedFees,
    activeStudents,
    rooms
  });
}

export async function getBillingRegister(hostelId: string, year: number) {
  // Fetch assignments, bed assignments and rent configs in parallel
  const [assignments, bedAssignmentsInHostel, allRentConfigs] = await Promise.all([
    prisma.hostelAssignment.findMany({
      where: { hostelId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            joiningDate: true,
            createdAt: true,
            studentProfile: { select: { fullName: true, completedAt: true } },
            bedAssignments: {
              where: { status: "ACTIVE" },
              include: { bed: { include: { room: true } } }
            }
          }
        }
      },
      orderBy: { assignedAt: 'asc' }
    }),
    prisma.bedAssignment.findMany({
      where: {
        status: "ACTIVE",
        bed: { room: { hostelId } }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            joiningDate: true,
            createdAt: true,
            studentProfile: { select: { fullName: true, completedAt: true } },
            bedAssignments: {
              where: { status: "ACTIVE" },
              include: { bed: { include: { room: true } } }
            }
          }
        }
      }
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
    const studentJoiningDate = a.user.joiningDate || a.user.studentProfile?.completedAt || a.assignedAt || a.user.createdAt;

    if (!usersMap.has(a.userId)) {
      usersMap.set(a.userId, {
        id: a.userId,
        name: a.user.studentProfile?.fullName?.trim() || a.user.username,
        username: a.user.username,
        studentProfile: a.user.studentProfile,
        bedAssignments: a.user.bedAssignments,
        joiningDate: studentJoiningDate,
        leftDate: a.status !== "ACTIVE" ? a.leftAt : null,
        isActive: a.status === "ACTIVE"
      });
    } else {
      const u = usersMap.get(a.userId)!;
      // If student does not have an explicit joiningDate on user model, use earliest assigned date
      if (!a.user.joiningDate && a.assignedAt < u.joiningDate) {
        u.joiningDate = a.assignedAt;
      }
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

  // Also include any active bed assignments in this hostel not already captured in usersMap
  for (const ba of bedAssignmentsInHostel) {
    if (ba.user && !usersMap.has(ba.userId)) {
      const studentJoiningDate = ba.user.joiningDate || ba.user.studentProfile?.completedAt || ba.assignedAt || ba.user.createdAt;
      usersMap.set(ba.userId, {
        id: ba.userId,
        name: ba.user.studentProfile?.fullName?.trim() || ba.user.username,
        username: ba.user.username,
        studentProfile: ba.user.studentProfile,
        bedAssignments: ba.user.bedAssignments,
        joiningDate: studentJoiningDate,
        leftDate: null,
        isActive: true
      });
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

  // Only fetch bills for the specified year or lifetime establishment fee bills
  const allBills = await prisma.bill.findMany({
    where: {
      hostelId,
      userId: { in: userIds },
      OR: [
        { year },
        { billType: "ESTABLISHMENT_FEE" },
        { month: 0, year: 0 },
      ],
    },
    include: {
      payments: {
        take: 3,
        orderBy: { paymentDate: "desc" },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          verifiedAt: true,
          utrNumber: true,
          transactionId: true,
          status: true,
        },
      },
    },
  });

  const result = [];
  for (const u of usersMap.values()) {
    const userBills = allBills.filter(b => b.userId === u.id);
    const yearBills = userBills.filter(b => b.year === year);

    // Locate standalone Bed Fee bill for this year (billType: BED_FEE or month: 0)
    const bedFeeBill = yearBills.find(b => b.billType === "BED_FEE" || (b.month === 0 && b.year === year) || Number(b.bedFee) > 0);
    const bedFee = {
      id: bedFeeBill ? bedFeeBill.id : null,
      amount: bedFeeBill ? Number(bedFeeBill.bedFee || bedFeeBill.totalAmount) : 0,
      status: bedFeeBill ? bedFeeBill.status : "NOT_BILLED"
    };

    // Locate standalone Establishment Fee bill (lifetime: billType: ESTABLISHMENT_FEE or month: 0, year: 0)
    const estFeeBill = userBills.find(b => b.billType === "ESTABLISHMENT_FEE" || (b.month === 0 && b.year === 0) || Number(b.establishmentFee) > 0);
    const estFee = {
      id: estFeeBill ? estFeeBill.id : null,
      amount: estFeeBill ? Number(estFeeBill.establishmentFee || estFeeBill.totalAmount) : 0,
      status: estFeeBill ? estFeeBill.status : "NOT_BILLED"
    };

    const monthly: Record<number, any> = {};
    for (let m = 1; m <= 12; m++) {
      const b = yearBills.find(x => x.month === m && x.billType !== "BED_FEE" && x.billType !== "ESTABLISHMENT_FEE");
      if (b) {
        const latestPayment = b.payments?.[0];
        monthly[m] = {
          id: b.id,
          amount: Number(b.rentAmount),
          totalAmount: Number(b.totalAmount),
          status: b.status,
          paidDate: latestPayment?.paymentDate || latestPayment?.verifiedAt || null,
          utrNumber: latestPayment?.utrNumber || latestPayment?.transactionId || null,
          payments: b.payments || [],
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
    const nameA = a.name?.trim() || a.username || "";
    const nameB = b.name?.trim() || b.username || "";
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });

  return serializeDecimals(result);
}
