import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';

vi.mock('@/lib/prisma', async () => {
  const { mockDeep } = await import('vitest-mock-extended');
  return {
    prisma: mockDeep(),
  };
});

import { prisma } from '@/lib/prisma';
import { fetchAnnualFinancialReport } from '@/lib/services/reports';

const prismaMock = prisma as any;

describe('Annual & Monthly Financial Reports', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it('correctly aggregates each month revenue, overdue, and billed amount', async () => {
    // Mock billsByMonth
    prismaMock.bill.groupBy.mockResolvedValueOnce([
      {
        month: 1,
        _sum: { totalAmount: 5000, paidAmount: 5000 },
        _count: { id: 2 },
      },
      {
        month: 2,
        _sum: { totalAmount: 6000, paidAmount: 4000 },
        _count: { id: 3 },
      },
      {
        month: 0,
        _sum: { totalAmount: 10000, paidAmount: 10000 },
        _count: { id: 5 },
      },
    ]);

    // Mock statusByMonth
    prismaMock.bill.groupBy.mockResolvedValueOnce([
      { month: 1, status: 'PAID', _count: { id: 2 }, _sum: { totalAmount: 5000, paidAmount: 5000 } },
      { month: 2, status: 'PARTIALLY_PAID', _count: { id: 1 }, _sum: { totalAmount: 3000, paidAmount: 1000 } },
      { month: 2, status: 'PAID', _count: { id: 2 }, _sum: { totalAmount: 3000, paidAmount: 3000 } },
    ]);

    // Mock overdueBills
    prismaMock.bill.findMany.mockResolvedValueOnce([
      {
        month: 2,
        totalAmount: 3000,
        paidAmount: 1000,
        userId: 'student-1',
      },
    ]);

    const report = await fetchAnnualFinancialReport(null, 2026);

    expect(report.year).toBe(2026);
    expect(report.months).toHaveLength(12);

    // Month 1 (January)
    const jan = report.months[0];
    expect(jan.month).toBe(1);
    expect(jan.monthName).toBe('January');
    expect(jan.totalBilled).toBe(5000);
    expect(jan.totalCollected).toBe(5000); // 100% revenue
    expect(jan.totalOverdue).toBe(0);
    expect(jan.collectionRate).toBe(100);

    // Month 2 (February)
    const feb = report.months[1];
    expect(feb.month).toBe(2);
    expect(feb.monthName).toBe('February');
    expect(feb.totalBilled).toBe(6000);
    expect(feb.totalCollected).toBe(4000);
    expect(feb.totalOverdue).toBe(2000);
    expect(feb.overdueCount).toBe(1);

    // Month 0 otherFees
    expect(report.otherFees).toBeDefined();
    expect(report.otherFees?.totalBilled).toBe(10000);
    expect(report.otherFees?.totalCollected).toBe(10000);

    // Grand totals
    expect(report.summary.totalBilled).toBe(21000); // 5000 + 6000 + 10000
    expect(report.summary.totalRevenue).toBe(19000); // 5000 + 4000 + 10000
    expect(report.summary.totalOverdue).toBe(2000);
  });
});
