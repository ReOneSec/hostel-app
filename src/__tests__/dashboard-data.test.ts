import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('@/lib/prisma', async () => {
  const { mockDeep } = await import('vitest-mock-extended');
  return {
    prisma: mockDeep()
  };
});

import { prisma } from '@/lib/prisma';
import { getDashboardStats } from '@/lib/services/dashboard';

const prismaMock = prisma as any;


describe('Dashboard Data Property Tests', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it('P1: DB aggregate equals JS sum', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            totalAmount: fc.integer({ min: 0, max: 100000 }),
            paidAmount: fc.integer({ min: 0, max: 100000 })
          })
        ),
        async (bills) => {
          const jsTotalBilled = bills.reduce((sum, b) => sum + b.totalAmount, 0);
          const jsTotalCollected = bills.reduce((sum, b) => sum + b.paidAmount, 0);

          prismaMock.hostel.count.mockResolvedValue(0);
          prismaMock.user.count.mockResolvedValue(0);
          prismaMock.bedAssignment.count.mockResolvedValue(0);
          prismaMock.user.findMany.mockResolvedValue([]);
          
          prismaMock.bill.aggregate.mockResolvedValueOnce({
            _sum: {
              totalAmount: jsTotalBilled,
              paidAmount: jsTotalCollected,
            },
          } as any);

          prismaMock.bill.aggregate.mockResolvedValueOnce({
            _sum: { totalAmount: 0, paidAmount: 0 },
          } as any);

          const result = await getDashboardStats();

          expect(result.payments.totalBilled).toBe(jsTotalBilled);
          expect(result.payments.totalCollected).toBe(jsTotalCollected);
        }
      )
    );
  });
});
