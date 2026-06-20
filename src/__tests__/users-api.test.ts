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
import { getUsersList } from '@/lib/services/users';

const prismaMock = prisma as any;


describe('Users API Property Tests', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it('P4: perPage cap invariant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -1000, max: 200 }),
        async (rawPerPage) => {
          prismaMock.user.findMany.mockClear();
          prismaMock.user.findMany.mockResolvedValue([]);
          prismaMock.user.count.mockResolvedValue(0);

          await getUsersList({ perPage: rawPerPage });

          const callArgs = prismaMock.user.findMany.mock.calls[0][0];
          
          let expectedTake = rawPerPage || 20;
          expectedTake = Math.min(expectedTake, 100);

          expect(callArgs?.take).toBe(expectedTake);
        }
      )
    );
  });

  it('P5: Meta consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          total: fc.integer({ min: 0, max: 10000 }),
          page: fc.integer({ min: 1, max: 100 }),
          perPage: fc.integer({ min: 1, max: 200 })
        }),
        async ({ total, page, perPage }) => {
          prismaMock.user.findMany.mockClear();
          prismaMock.user.findMany.mockResolvedValue([]);
          prismaMock.user.count.mockResolvedValue(total);

          const result = await getUsersList({ page, perPage });

          const expectedPerPage = Math.min(perPage, 100);

          expect(result.meta.totalPages).toBe(Math.ceil(total / expectedPerPage));
          expect(result.meta.page).toBe(page);
          expect(result.meta.perPage).toBe(expectedPerPage);
          expect(result.meta.total).toBe(total);
          
          expect(result.meta.totalPages).toBeGreaterThanOrEqual(0);
          expect(result.meta.page).toBeGreaterThanOrEqual(0);
          expect(result.meta.perPage).toBeGreaterThanOrEqual(0);
          expect(result.meta.total).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });
});
