import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { unstable_cache } from "next/cache";

async function fetchPaymentReport(hostelId: string | null, month: number, year: number) {
  const whereClause: any = { month, year };
  if (hostelId) whereClause.hostelId = hostelId;

  // FIX 6: Parallelise queries and aggregate in SQL instead of JS
  const [billsSum, statusGroups, overdueBills] = await Promise.all([
    prisma.bill.aggregate({
      where: whereClause,
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.bill.groupBy({
      by: ["status"],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.bill.findMany({
      where: {
        ...whereClause,
        OR: [
          { status: "OVERDUE" },
          {
            status: { in: ["GENERATED", "PARTIALLY_PAID"] },
            dueDate: { lt: new Date() },
          },
        ],
      },
      select: {
        userId: true,
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
        status: true,
        user: {
          select: {
            email: true,
            studentProfile: { select: { fullName: true } },
          },
        },
        hostel: { select: { name: true } },
      },
    }),
  ]);

  const totalBilled = billsSum._sum.totalAmount ? Number(billsSum._sum.totalAmount) : 0;
  const totalReceived = billsSum._sum.paidAmount ? Number(billsSum._sum.paidAmount) : 0;
  const totalBills = billsSum._count.id || 0;

  const statusBreakdown: Record<string, { count: number; amount: number }> = {
    GENERATED: { count: 0, amount: 0 },
    PARTIALLY_PAID: { count: 0, amount: 0 },
    PAID: { count: 0, amount: 0 },
    OVERDUE: { count: 0, amount: 0 },
  };

  for (const group of statusGroups) {
    if (statusBreakdown[group.status]) {
      statusBreakdown[group.status] = {
        count: group._count.id,
        amount: group._sum.totalAmount ? Number(group._sum.totalAmount) : 0,
      };
    }
  }

  let totalOverdue = 0;
  const overdueStudents: any[] = [];

  for (const bill of overdueBills) {
    const total = Number(bill.totalAmount);
    const paid = Number(bill.paidAmount);
    const remaining = total - paid;
    totalOverdue += remaining;
    overdueStudents.push({
      userId: bill.userId,
      name: bill.user.studentProfile?.fullName || bill.user.email,
      hostel: bill.hostel.name,
      totalAmount: total,
      paidAmount: paid,
      overdueAmount: remaining,
      dueDate: bill.dueDate,
    });
  }

  const totalPending = Math.max(0, totalBilled - totalReceived);

  overdueStudents.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  return {
    month,
    year,
    summary: {
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalReceived: Math.round(totalReceived * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      totalBills,
      overdueCount: overdueStudents.length,
    },
    statusBreakdown,
    overdueStudents,
  };
}

const getCachedPaymentReport = (hostelId: string | null, month: number, year: number) => {
  if (process.env.NODE_ENV === "test") {
    return fetchPaymentReport(hostelId, month, year);
  }
  return unstable_cache(
    () => fetchPaymentReport(hostelId, month, year),
    [`report-payments-${hostelId || "all"}-${month}-${year}`],
    {
      revalidate: 60,
      tags: ["report-payments", "dashboard-stats"],
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
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()));

    const data = await getCachedPaymentReport(hostelId, month, year);
    return successResponse(data);
  } catch (error) {
    console.error("[Reports Payments]", error);
    return errorResponse("Internal server error", 500);
  }
}
