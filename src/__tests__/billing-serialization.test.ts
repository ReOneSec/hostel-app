import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { serializeDecimals } from '@/lib/services/billing';

describe('serializeDecimals utility', () => {
  it('converts top-level and nested Prisma.Decimal objects to plain numbers', () => {
    const rawData = {
      id: 'rc_123',
      userId: 'user_456',
      hostelId: 'hostel_789',
      amount: new Prisma.Decimal('5500.50'),
      effectiveFrom: new Date('2026-10-01T00:00:00.000Z'),
      effectiveTo: null,
      notes: 'Custom rent',
      user: {
        id: 'user_456',
        username: 'student1',
        bedFee: new Prisma.Decimal('1200'),
      },
      payments: [
        { id: 'p_1', amount: new Prisma.Decimal('3000.00') },
        { id: 'p_2', amount: new Prisma.Decimal('2500.50') },
      ],
    };

    const serialized = serializeDecimals(rawData);

    // Verify all Decimals are now numbers
    expect(typeof serialized.amount).toBe('number');
    expect(serialized.amount).toBe(5500.5);

    expect(typeof serialized.user.bedFee).toBe('number');
    expect(serialized.user.bedFee).toBe(1200);

    expect(typeof serialized.payments[0].amount).toBe('number');
    expect(serialized.payments[0].amount).toBe(3000);
    expect(serialized.payments[1].amount).toBe(2500.5);

    // Verify date is ISO string
    expect(typeof serialized.effectiveFrom).toBe('string');
    expect(serialized.effectiveFrom).toBe('2026-10-01T00:00:00.000Z');

    // Verify null and primitives remain intact
    expect(serialized.effectiveTo).toBeNull();
    expect(serialized.id).toBe('rc_123');

    // Verify that the serialized object is 100% plain and has no Decimal instances
    const hasDecimal = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      if (obj instanceof Prisma.Decimal) return true;
      return Object.values(obj).some(hasDecimal);
    };

    expect(hasDecimal(serialized)).toBe(false);
  });

  it('handles null and undefined values safely', () => {
    expect(serializeDecimals(null)).toBeNull();
    expect(serializeDecimals(undefined)).toBeUndefined();
    expect(serializeDecimals([])).toEqual([]);
  });
});
