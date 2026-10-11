import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockReturnValue({
        catch: vi.fn(),
      }),
    },
  },
}));

import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

describe('Audit Log service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('safely handles Decimal-like objects that broke structuredClone', async () => {
    // Mimic Prisma Decimal with prototype methods and constructor
    class FakeDecimal {
      value: number;
      constructor(val: number) {
        this.value = val;
      }
      toJSON() {
        return this.value.toString();
      }
    }

    const decimalVal = new FakeDecimal(1500);

    await expect(
      createAuditLog({
        userId: 'admin-1',
        action: 'BILL_UPDATED',
        entity: 'Bill',
        entityId: 'bill-123',
        oldValues: { rentAmount: decimalVal as any },
        newValues: { rentAmount: new FakeDecimal(2000) as any },
      })
    ).resolves.not.toThrow();

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'admin-1',
        action: 'BILL_UPDATED',
        entity: 'Bill',
        entityId: 'bill-123',
        oldValues: { rentAmount: '1500' },
        newValues: { rentAmount: '2000' },
      }),
    });
  });

  it('never throws even if an object has circular references', async () => {
    const circular: any = {};
    circular.self = circular;

    await expect(
      createAuditLog({
        userId: 'admin-1',
        action: 'CIRCULAR_TEST',
        entity: 'Test',
        oldValues: circular,
      })
    ).resolves.not.toThrow();

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        oldValues: undefined,
      }),
    });
  });
});
