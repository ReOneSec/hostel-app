import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const getUserMock = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn()
}));

vi.mock('@/lib/prisma', async () => {
  const { mockDeep } = await import('vitest-mock-extended');
  return {
    prisma: mockDeep()
  };
});

const getSessionMock = vi.fn();

import { mockReset } from 'vitest-mock-extended';

const prismaMock = prisma as any;

describe('Auth Helper Property Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockReset(prismaMock);
    getUserMock.mockReset();
    getSessionMock.mockReset();
    (createClient as any).mockResolvedValue({
      auth: { getUser: getUserMock, getSession: getSessionMock }
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
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
          process.env.NODE_ENV = 'production';
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
});
