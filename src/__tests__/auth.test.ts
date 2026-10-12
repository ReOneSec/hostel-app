import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const getUserMock = vi.fn();
const getSessionMock = vi.fn();
const headersGetMock = vi.fn();
const supabaseJsGetUserMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: headersGetMock,
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: supabaseJsGetUserMock,
    },
  })),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn()
}));

vi.mock('@/lib/prisma', async () => {
  const { mockDeep } = await import('vitest-mock-extended');
  return {
    prisma: mockDeep()
  };
});

import { mockReset } from 'vitest-mock-extended';

const prismaMock = prisma as any;


describe('Auth Helper Property Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockReset(prismaMock);
    getUserMock.mockReset();
    getSessionMock.mockReset();
    headersGetMock.mockReset();
    supabaseJsGetUserMock.mockReset();
    headersGetMock.mockReturnValue(null);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    (createClient as any).mockResolvedValue({
      auth: { getUser: getUserMock, getSession: getSessionMock }
    });
    vi.restoreAllMocks();
  });


  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
  });

  it('P2: Auth session field exactness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          role: fc.constantFrom("SUPER_ADMIN", "HOSTEL_MANAGER", "STUDENT"),
          status: fc.constant("ACTIVE"),
          isFirstLogin: fc.boolean(),
          isProfileComplete: fc.boolean(),
          needsSelfieUpdate: fc.boolean(),
          privacyConsentAt: fc.date(),
          username: fc.string(),
          // Extra DB fields that should NOT be in the session
          extraField1: fc.string(),
          passwordHash: fc.string()
        }),
        async (dbUser) => {
          getSessionMock.mockResolvedValue({ data: { session: { user: { email: dbUser.email } } } });
          getUserMock.mockResolvedValue({ data: { user: { email: dbUser.email } } });
          prismaMock.user.findUnique.mockResolvedValue(dbUser as any);

          const session = await auth();
          
          expect(session).not.toBeNull();
          if (session) {
            const keys = Object.keys(session.user).sort();
            const expectedKeys = [
              'id', 'email', 'role', 'status', 'isFirstLogin', 
              'isProfileComplete', 'needsSelfieUpdate', 'privacyConsentAt', 'username'
            ].sort();
            
            expect(keys).toEqual(expectedKeys);
            
            // Should not have the extra fields
            expect((session.user as any).extraField1).toBeUndefined();
            expect((session.user as any).passwordHash).toBeUndefined();
          }
        }
      )
    );
  });

  it('P3: Non-ACTIVE returns null', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          status: fc.constantFrom("INACTIVE", "SUSPENDED")
        }),
        async ({ email, status }) => {
          getSessionMock.mockResolvedValue({ data: { session: { user: { email } } } });
          getUserMock.mockResolvedValue({ data: { user: { email } } });
          prismaMock.user.findUnique.mockResolvedValue({ email, status } as any);

          const session = await auth();
          
          expect(session).toBeNull();
        }
      )
    );
  });

  it('P8: No console output in prod', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (isSuccess) => {
          (process.env as any).NODE_ENV = 'production';
          const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
          const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

          if (isSuccess) {
            getSessionMock.mockResolvedValue({ data: { session: { user: { email: "test@test.com" } } } });
            getUserMock.mockResolvedValue({ data: { user: { email: "test@test.com" } } });
            prismaMock.user.findUnique.mockResolvedValue({
              id: "1", email: "test@test.com", role: "STUDENT", status: "ACTIVE",
              isFirstLogin: false, isProfileComplete: true, needsSelfieUpdate: false,
              privacyConsentAt: new Date(), username: "test"
            } as any);
          } else {
            // Fail by missing email
            getSessionMock.mockResolvedValue({ data: { session: null } });
            getUserMock.mockResolvedValue({ data: { user: null } });
          }

          await auth();

          expect(consoleErrorSpy).not.toHaveBeenCalled();
          expect(consoleLogSpy).not.toHaveBeenCalled();
        }
      )
    );
  });

  describe('Bearer Token Support (Phase 1)', () => {
    it('authenticates valid Bearer token for active user', async () => {
      headersGetMock.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'authorization') return 'Bearer valid-jwt-token';
        return null;
      });
      supabaseJsGetUserMock.mockResolvedValue({
        data: { user: { email: 'student@mirrorhostels.com' } },
        error: null,
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'usr_123',
        email: 'student@mirrorhostels.com',
        role: 'STUDENT',
        status: 'ACTIVE',
        isFirstLogin: false,
        isProfileComplete: true,
        needsSelfieUpdate: false,
        privacyConsentAt: new Date(),
        username: 'student123',
      } as any);

      const session = await auth();

      expect(session).not.toBeNull();
      expect(session?.user.email).toBe('student@mirrorhostels.com');
      expect(session?.user.role).toBe('STUDENT');
      expect(session?.user.id).toBe('usr_123');
      expect(supabaseJsGetUserMock).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('returns null when Bearer token is invalid or expired', async () => {
      headersGetMock.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'authorization') return 'Bearer expired-or-invalid-token';
        return null;
      });
      supabaseJsGetUserMock.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      const session = await auth();

      expect(session).toBeNull();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns null when Bearer user is SUSPENDED or INACTIVE', async () => {
      headersGetMock.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'authorization') return 'Bearer token-inactive-user';
        return null;
      });
      supabaseJsGetUserMock.mockResolvedValue({
        data: { user: { email: 'suspended@mirrorhostels.com' } },
        error: null,
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'usr_suspended',
        email: 'suspended@mirrorhostels.com',
        role: 'STUDENT',
        status: 'SUSPENDED',
      } as any);

      const session = await auth();

      expect(session).toBeNull();
    });

    it('falls back to cookie session when no Bearer header is passed', async () => {
      headersGetMock.mockReturnValue(null);
      getSessionMock.mockResolvedValue({ data: { session: { user: { email: 'cookie@mirrorhostels.com' } } } });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'usr_cookie',
        email: 'cookie@mirrorhostels.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        isFirstLogin: false,
        isProfileComplete: true,
        needsSelfieUpdate: false,
        privacyConsentAt: null,
        username: 'admin',
      } as any);

      const session = await auth();

      expect(session).not.toBeNull();
      expect(session?.user.email).toBe('cookie@mirrorhostels.com');
      expect(session?.user.role).toBe('SUPER_ADMIN');
    });
  });
});

