import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    bill: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
  getIpAddress: vi.fn().mockReturnValue('127.0.0.1'),
  getUserAgent: vi.fn().mockReturnValue('test-agent'),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PATCH } from '@/app/api/billing/bills/[id]/status/route';

describe('Bill Status PATCH API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated request', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any);
    const req = new Request('http://localhost/api/billing/bills/b1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PAID' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(401);
  });

  it('rejects STUDENT role', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 's1', role: 'STUDENT' },
    } as any);
    const req = new Request('http://localhost/api/billing/bills/b1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PAID' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(401);
  });

  it('allows HOSTEL_MANAGER to update bill status', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'mgr1', role: 'HOSTEL_MANAGER' },
    } as any);

    vi.mocked(prisma.bill.findUnique).mockResolvedValueOnce({
      id: 'b1',
      status: 'GENERATED',
      totalAmount: 2500 as any,
      paidAmount: 0 as any,
    } as any);

    vi.mocked(prisma.bill.update).mockResolvedValueOnce({
      id: 'b1',
      status: 'PAID',
      paidAmount: 2500 as any,
    } as any);

    const req = new Request('http://localhost/api/billing/bills/b1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PAID' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('PAID');
    expect(prisma.bill.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: {
        status: 'PAID',
        paidAmount: 2500,
      },
    });
  });

  it('allows SUPER_ADMIN to update bill status', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    } as any);

    vi.mocked(prisma.bill.findUnique).mockResolvedValueOnce({
      id: 'b2',
      status: 'PAID',
      totalAmount: 3000 as any,
      paidAmount: 3000 as any,
    } as any);

    vi.mocked(prisma.bill.update).mockResolvedValueOnce({
      id: 'b2',
      status: 'GENERATED',
      paidAmount: 0 as any,
    } as any);

    const req = new Request('http://localhost/api/billing/bills/b2/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'GENERATED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'b2' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('GENERATED');
    expect(prisma.bill.update).toHaveBeenCalledWith({
      where: { id: 'b2' },
      data: {
        status: 'GENERATED',
        paidAmount: 0,
      },
    });
  });
});
