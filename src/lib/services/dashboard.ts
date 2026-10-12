import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

async function fetchDashboardStats() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Parallelise all queries in a single Promise.all (FIX 6)
  const [
    totalHostels,
    totalStudents,
    bedsOccupied,
    billsSum,
    overdueSum,
    recentUsers,
  ] = await Promise.all([
    prisma.hostel.count(),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.bedAssignment.count({ where: { status: "ACTIVE" } }),
    prisma.bill.aggregate({
      where: { month, year },
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
    }),
    prisma.bill.aggregate({
      where: {
        month,
        year,
        dueDate: { lt: now },
      },
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
    }),
    prisma.user.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      select: { username: true, role: true, createdAt: true },
    }),
  ]);

  const totalBilled = billsSum._sum.totalAmount ? Number(billsSum._sum.totalAmount) : 0;
  const totalCollected = billsSum._sum.paidAmount ? Number(billsSum._sum.paidAmount) : 0;
  const totalPending = totalBilled - totalCollected;

  const overdueBilled = overdueSum._sum.totalAmount ? Number(overdueSum._sum.totalAmount) : 0;
  const overdueCollected = overdueSum._sum.paidAmount ? Number(overdueSum._sum.paidAmount) : 0;
  const totalOverdue = overdueBilled - overdueCollected;

  return {
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
      totalOverdue: Math.max(0, totalOverdue),
    },
    recentActivity: recentUsers.map((u) => ({
      text: `New ${u.role.toLowerCase().replace("_", " ")} joined: ${u.username}`,
      date: u.createdAt,
    })),
  };
}

// Wrap dashboard stats in unstable_cache with 60s TTL and tag invalidation (FIX 7)
const cachedDashboardStats = unstable_cache(
  fetchDashboardStats,
  ["dashboard-stats"],
  {
    revalidate: 60,
    tags: ["dashboard-stats"],
  }
);

export async function getDashboardStats() {
  if (process.env.NODE_ENV === "test") {
    return fetchDashboardStats();
  }
  return cachedDashboardStats();
}
