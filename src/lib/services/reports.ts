import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export interface MonthlyFinancialRecord {
  month: number;
  monthName: string;
  monthShort: string;
  totalBilled: number;
  totalCollected: number; // Revenue
  totalOverdue: number;
  totalPending: number;
  collectionRate: number; // Percentage
  totalBills: number;
  paidCount: number;
  overdueCount: number;
  pendingCount: number;
  partiallyPaidCount: number;
}

export interface AnnualFinancialReport {
  year: number;
  hostelId: string | null;
  summary: {
    totalBilled: number;
    totalRevenue: number;
    totalOverdue: number;
    totalPending: number;
    collectionRate: number;
    totalBills: number;
    totalOverdueCount: number;
    highestRevenueMonth: {
      month: number;
      monthName: string;
      amount: number;
    } | null;
    highestOverdueMonth: {
      month: number;
      monthName: string;
      amount: number;
    } | null;
  };
  months: MonthlyFinancialRecord[];
  otherFees?: {
    label: string;
    totalBilled: number;
    totalCollected: number;
    totalOverdue: number;
    totalPending: number;
    totalBills: number;
    collectionRate: number;
  } | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORTS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export async function fetchAnnualFinancialReport(
  hostelId: string | null,
  year: number
): Promise<AnnualFinancialReport> {
  const whereClause: any = { year };
  if (hostelId && hostelId !== "all") {
    whereClause.hostelId = hostelId;
  }

  const now = new Date();

  // Run database aggregations in parallel
  const [billsByMonth, statusByMonth, overdueBills] = await Promise.all([
    prisma.bill.groupBy({
      by: ["month"],
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
      by: ["month", "status"],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
    }),
    prisma.bill.findMany({
      where: {
        ...whereClause,
        OR: [
          { status: "OVERDUE" },
          {
            status: { in: ["GENERATED", "PARTIALLY_PAID"] },
            dueDate: { lt: now },
          },
        ],
      },
      select: {
        month: true,
        totalAmount: true,
        paidAmount: true,
        userId: true,
      },
    }),
  ]);

  // Maps for quick lookup
  const billedMap: Record<number, number> = {};
  const collectedMap: Record<number, number> = {};
  const billCountMap: Record<number, number> = {};

  for (const b of billsByMonth) {
    const m = b.month;
    billedMap[m] = b._sum.totalAmount ? Number(b._sum.totalAmount) : 0;
    collectedMap[m] = b._sum.paidAmount ? Number(b._sum.paidAmount) : 0;
    billCountMap[m] = b._count.id || 0;
  }

  // Status counts per month
  const statusMap: Record<number, Record<string, number>> = {};
  for (const s of statusByMonth) {
    if (!statusMap[s.month]) statusMap[s.month] = {};
    statusMap[s.month][s.status] = s._count.id || 0;
  }

  // Overdue amounts and students
  const overdueMap: Record<number, number> = {};
  const overdueStudentsMap: Record<number, Set<string>> = {};

  for (const ob of overdueBills) {
    const m = ob.month;
    const remaining = Math.max(0, Number(ob.totalAmount) - Number(ob.paidAmount));
    overdueMap[m] = (overdueMap[m] || 0) + remaining;

    if (!overdueStudentsMap[m]) {
      overdueStudentsMap[m] = new Set<string>();
    }
    overdueStudentsMap[m].add(ob.userId);
  }

  const months: MonthlyFinancialRecord[] = [];
  let totalBilledAllMonths = 0;
  let totalRevenueAllMonths = 0;
  let totalOverdueAllMonths = 0;
  let totalBillsAllMonths = 0;
  const uniqueOverdueUsersAllYear = new Set<string>();

  let maxRevenue = -1;
  let maxRevenueMonth: { month: number; monthName: string; amount: number } | null = null;
  let maxOverdue = 0;
  let maxOverdueMonth: { month: number; monthName: string; amount: number } | null = null;

  for (let m = 1; m <= 12; m++) {
    const billed = Math.round((billedMap[m] || 0) * 100) / 100;
    const collected = Math.round((collectedMap[m] || 0) * 100) / 100;
    const overdue = Math.round((overdueMap[m] || 0) * 100) / 100;
    const totalOutstanding = Math.max(0, billed - collected);
    const pending = Math.max(0, Math.round((totalOutstanding - overdue) * 100) / 100);
    const collectionRate = billed > 0 ? Math.min(100, Math.round((collected / billed) * 100)) : 0;

    const overdueCount = overdueStudentsMap[m]?.size || 0;
    const totalBills = billCountMap[m] || 0;
    const paidCount = statusMap[m]?.PAID || 0;
    const partiallyPaidCount = statusMap[m]?.PARTIALLY_PAID || 0;
    const pendingCount = (statusMap[m]?.GENERATED || 0) + partiallyPaidCount;

    if (overdueStudentsMap[m]) {
      for (const uid of overdueStudentsMap[m]) {
        uniqueOverdueUsersAllYear.add(uid);
      }
    }

    if (collected > maxRevenue) {
      maxRevenue = collected;
      maxRevenueMonth = {
        month: m,
        monthName: MONTH_NAMES[m - 1],
        amount: collected,
      };
    }

    if (overdue > maxOverdue) {
      maxOverdue = overdue;
      maxOverdueMonth = {
        month: m,
        monthName: MONTH_NAMES[m - 1],
        amount: overdue,
      };
    }

    totalBilledAllMonths += billed;
    totalRevenueAllMonths += collected;
    totalOverdueAllMonths += overdue;
    totalBillsAllMonths += totalBills;

    months.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      monthShort: MONTH_SHORTS[m - 1],
      totalBilled: billed,
      totalCollected: collected,
      totalOverdue: overdue,
      totalPending: pending,
      collectionRate,
      totalBills,
      paidCount,
      overdueCount,
      pendingCount,
      partiallyPaidCount,
    });
  }

  // Handle month 0 (Annual Bed Fee / Establishment Fee billed separately)
  let otherFees: AnnualFinancialReport["otherFees"] = null;
  if (billedMap[0] !== undefined || collectedMap[0] !== undefined) {
    const b0 = Math.round((billedMap[0] || 0) * 100) / 100;
    const c0 = Math.round((collectedMap[0] || 0) * 100) / 100;
    const o0 = Math.round((overdueMap[0] || 0) * 100) / 100;
    const outstanding0 = Math.max(0, b0 - c0);
    const p0 = Math.max(0, Math.round((outstanding0 - o0) * 100) / 100);
    const rate0 = b0 > 0 ? Math.min(100, Math.round((c0 / b0) * 100)) : 0;

    otherFees = {
      label: "Annual Bed & Establishment Fees",
      totalBilled: b0,
      totalCollected: c0,
      totalOverdue: o0,
      totalPending: p0,
      totalBills: billCountMap[0] || 0,
      collectionRate: rate0,
    };

    totalBilledAllMonths += b0;
    totalRevenueAllMonths += c0;
    totalOverdueAllMonths += o0;
    totalBillsAllMonths += billCountMap[0] || 0;
  }

  const grandBilled = Math.round(totalBilledAllMonths * 100) / 100;
  const grandRevenue = Math.round(totalRevenueAllMonths * 100) / 100;
  const grandOverdue = Math.round(totalOverdueAllMonths * 100) / 100;
  const grandOutstanding = Math.max(0, grandBilled - grandRevenue);
  const grandPending = Math.max(0, Math.round((grandOutstanding - grandOverdue) * 100) / 100);
  const grandCollectionRate = grandBilled > 0 ? Math.min(100, Math.round((grandRevenue / grandBilled) * 100)) : 0;

  return {
    year,
    hostelId: hostelId || null,
    summary: {
      totalBilled: grandBilled,
      totalRevenue: grandRevenue,
      totalOverdue: grandOverdue,
      totalPending: grandPending,
      collectionRate: grandCollectionRate,
      totalBills: totalBillsAllMonths,
      totalOverdueCount: uniqueOverdueUsersAllYear.size,
      highestRevenueMonth: maxRevenueMonth && maxRevenueMonth.amount > 0 ? maxRevenueMonth : null,
      highestOverdueMonth: maxOverdueMonth && maxOverdueMonth.amount > 0 ? maxOverdueMonth : null,
    },
    months,
    otherFees,
  };
}

export async function getAnnualFinancialReport(
  hostelId: string | null,
  year: number
): Promise<AnnualFinancialReport> {
  if (process.env.NODE_ENV === "test") {
    return fetchAnnualFinancialReport(hostelId, year);
  }

  return unstable_cache(
    () => fetchAnnualFinancialReport(hostelId, year),
    [`annual-financial-report-${hostelId || "all"}-${year}`],
    {
      revalidate: 60,
      tags: ["report-payments", "dashboard-stats"],
    }
  )();
}
