import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [totalHostels, totalStudents, bedsOccupied] = await Promise.all([
    prisma.hostel.count(),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.bedAssignment.count({ where: { status: "ACTIVE" } }),
  ]);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [billsSum, overdueSum] = await Promise.all([
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
  ]);

  const totalBilled = billsSum._sum.totalAmount ? Number(billsSum._sum.totalAmount) : 0;
  const totalCollected = billsSum._sum.paidAmount ? Number(billsSum._sum.paidAmount) : 0;
  const totalPending = totalBilled - totalCollected;

  const overdueBilled = overdueSum._sum.totalAmount ? Number(overdueSum._sum.totalAmount) : 0;
  const overdueCollected = overdueSum._sum.paidAmount ? Number(overdueSum._sum.paidAmount) : 0;
  const totalOverdue = overdueBilled - overdueCollected;

  const recentUsers = await prisma.user.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    select: { username: true, role: true, createdAt: true },
  });

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
