import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized", 403);
    }

    const [totalHostels, totalStudents, bedsOccupied] = await Promise.all([
      prisma.hostel.count(),
      prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
      prisma.bedAssignment.count({ where: { status: "ACTIVE" } })
    ]);

    // Payments for current month
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    const bills = await prisma.bill.findMany({
      where: {
        month,
        year,
      }
    });

    let totalBilled = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    for (const bill of bills) {
      const billed = Number(bill.totalAmount);
      const paid = Number(bill.paidAmount);
      const pending = billed - paid;
      
      totalBilled += billed;
      totalCollected += paid;
      totalPending += pending;

      if (pending > 0 && bill.dueDate && bill.dueDate < now) {
        totalOverdue += pending;
      }
    }

    // Recent activity - last 3 users created
    const recentUsers = await prisma.user.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { username: true, role: true, createdAt: true }
    });

    return successResponse({
      stats: {
        totalHostels,
        totalStudents,
        bedsOccupied,
        pendingPayments: totalPending,
      },
      payments: {
        totalBilled,
        totalCollected,
        totalPending,
        totalOverdue,
      },
      recentActivity: recentUsers.map(u => ({
        text: `New ${u.role.toLowerCase().replace('_', ' ')} joined: ${u.username}`,
        date: u.createdAt,
      }))
    });
  } catch (error) {
    console.error("[Dashboard Stats Error]", error);
    return errorResponse("Internal server error", 500);
  }
}
