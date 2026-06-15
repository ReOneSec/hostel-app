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
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()));

    const whereClause: any = { month, year };
    if (hostelId) whereClause.hostelId = hostelId;

    const bills = await prisma.bill.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            studentProfile: { select: { fullName: true } },
          },
        },
        hostel: { select: { name: true } },
      },
    });

    let totalBilled = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    const overdueStudents: any[] = [];

    const statusBreakdown: Record<string, { count: number; amount: number }> = {
      GENERATED: { count: 0, amount: 0 },
      PARTIALLY_PAID: { count: 0, amount: 0 },
      PAID: { count: 0, amount: 0 },
      OVERDUE: { count: 0, amount: 0 },
    };

    for (const bill of bills) {
      const total = Number(bill.totalAmount);
      const paid = Number(bill.paidAmount);
      totalBilled += total;
      totalReceived += paid;

      const status = bill.status;
      if (statusBreakdown[status]) {
        statusBreakdown[status].count++;
        statusBreakdown[status].amount += total;
      }

      if (status === "GENERATED" || status === "PARTIALLY_PAID") {
        const remaining = total - paid;
        totalPending += remaining;

        if (new Date() > new Date(bill.dueDate)) {
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
      }

      if (status === "OVERDUE") {
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
    }

    return successResponse({
      month,
      year,
      summary: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalReceived: Math.round(totalReceived * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        totalBills: bills.length,
        overdueCount: overdueStudents.length,
      },
      statusBreakdown,
      overdueStudents,
    });
  } catch (error) {
    console.error("[Reports Payments]", error);
    return errorResponse("Internal server error", 500);
  }
}
