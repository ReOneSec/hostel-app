import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    bill: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    rentConfig: {
      findFirst: vi.fn(),
    },
    lateFeeRecord: {
      deleteMany: vi.fn(),
    },
    payment: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
  getIpAddress: vi.fn().mockReturnValue('127.0.0.1'),
  getUserAgent: vi.fn().mockReturnValue('test-agent'),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/billing/bills/month-status/route';

describe('Billing Month Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized access if not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any);
    const req = new Request('http://localhost/api/billing/bills/month-status', {
      method: 'POST',
      body: JSON.stringify({ hostelId: 'h1', userId: 'u1', month: 10, year: 2026, status: 'PAID' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects missing or invalid month', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    } as any);

    const req = new Request('http://localhost/api/billing/bills/month-status', {
      method: 'POST',
      body: JSON.stringify({ hostelId: 'h1', userId: 'u1', month: 13, year: 2026, status: 'PAID' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid month');
  });

  it('creates a new bill with status PAID when no bill existed', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    } as any);

    vi.mocked(prisma.bill.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.bill.create).mockResolvedValueOnce({
      id: 'new-bill-1',
      userId: 'u1',
      hostelId: 'h1',
      month: 10,
      year: 2026,
      rentAmount: 1400 as any,
      totalAmount: 1400 as any,
      paidAmount: 1400 as any,
      status: 'PAID',
    } as any);

    const req = new Request('http://localhost/api/billing/bills/month-status', {
      method: 'POST',
      body: JSON.stringify({
        hostelId: 'h1',
        userId: 'u1',
        month: 10,
        year: 2026,
        status: 'PAID',
        amount: 1400,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.bill.status).toBe('PAID');
    expect(prisma.bill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          hostelId: 'h1',
          month: 10,
          year: 2026,
          status: 'PAID',
          rentAmount: 1400,
          totalAmount: 1400,
          paidAmount: 1400,
        }),
      })
    );
  });

  it('updates an existing bill status to GENERATED (unpaid)', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    } as any);

    vi.mocked(prisma.bill.findUnique).mockResolvedValueOnce({
      id: 'existing-bill-1',
      userId: 'u1',
      hostelId: 'h1',
      month: 10,
      year: 2026,
      rentAmount: 1400 as any,
      bedFee: 0 as any,
      establishmentFee: 0 as any,
      totalAmount: 1400 as any,
      paidAmount: 1400 as any,
      status: 'PAID',
    } as any);

    vi.mocked(prisma.bill.update).mockResolvedValueOnce({
      id: 'existing-bill-1',
      status: 'GENERATED',
      paidAmount: 0 as any,
    } as any);

    const req = new Request('http://localhost/api/billing/bills/month-status', {
      method: 'POST',
      body: JSON.stringify({
        hostelId: 'h1',
        userId: 'u1',
        month: 10,
        year: 2026,
        status: 'GENERATED',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(prisma.bill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'existing-bill-1' },
        data: expect.objectContaining({
          status: 'GENERATED',
          paidAmount: 0,
        }),
      })
    );
  });

  it('deletes bill when status is NOT_BILLED', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    } as any);

    vi.mocked(prisma.bill.findUnique).mockResolvedValueOnce({
      id: 'existing-bill-1',
      status: 'PAID',
    } as any);

    const req = new Request('http://localhost/api/billing/bills/month-status', {
      method: 'POST',
      body: JSON.stringify({
        hostelId: 'h1',
        userId: 'u1',
        month: 10,
        year: 2026,
        status: 'NOT_BILLED',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.bill).toBeNull();
  });
});
