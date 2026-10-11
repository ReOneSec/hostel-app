import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    hostelManagerAssignment: {
      findMany: vi.fn(),
    },
    hostelAssignment: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: [{ id: 'supa-123', email: 'old@mirror.std' }] },
          error: null,
        }),
        updateUserById: vi.fn().mockResolvedValue({
          data: { user: { id: 'supa-123', email: 'new@mirror.std' } },
          error: null,
        }),
      },
    },
  })),
}));

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
  getIpAddress: vi.fn().mockReturnValue('127.0.0.1'),
  getUserAgent: vi.fn().mockReturnValue('test-agent'),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PATCH } from '@/app/api/users/[id]/email/route';

describe('User Email Update API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized access if no session', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any);
    const req = new NextRequest('http://localhost/api/users/u1/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'new@mirror.std' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'u1' }) });
    expect(res.status).toBe(403);
  });

  it('rejects invalid email address format', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    } as any);

    const req = new NextRequest('http://localhost/api/users/u1/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'invalid-email' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'u1' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('valid email');
  });

  it('rejects if new email is identical to current email', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'u1',
      email: 'same@mirror.std',
      username: 'same',
      role: 'STUDENT',
    } as any);

    const req = new NextRequest('http://localhost/api/users/u1/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'same@mirror.std' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'u1' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('identical');
  });

  it('rejects if new email is already in use by another account', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    } as any);
    // Target user
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({
        id: 'u1',
        email: 'old@mirror.std',
        username: 'old',
        role: 'STUDENT',
      } as any)
      // Existing user with new email
      .mockResolvedValueOnce({
        id: 'u2',
        email: 'taken@mirror.std',
        username: 'taken',
        role: 'STUDENT',
      } as any);

    const req = new NextRequest('http://localhost/api/users/u1/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'taken@mirror.std' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'u1' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already exists');
  });

  it('successfully updates email in Supabase and Prisma when valid', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    } as any);
    // Target user found
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({
        id: 'u1',
        email: 'old@mirror.std',
        username: 'student1',
        role: 'STUDENT',
      } as any)
      // New email is available
      .mockResolvedValueOnce(null);

    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      id: 'u1',
      email: 'new@mirror.std',
    } as any);

    const req = new NextRequest('http://localhost/api/users/u1/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'new@mirror.std' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'u1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('new@mirror.std');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { email: 'new@mirror.std' },
    });
  });
});
