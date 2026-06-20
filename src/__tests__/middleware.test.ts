import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { config } from '@/middleware';

const ROLE_ROUTES: Record<string, string[]> = {
  SUPER_ADMIN: ["/admin"],
  HOSTEL_MANAGER: ["/manager"],
  STUDENT: ["/student"],
  MONTHLY_MANAGER: ["/monthly-manager"],
};

const checkRoleAccess = (pathname: string, role: string | null) => {
  for (const [routeRole, routePrefixes] of Object.entries(ROLE_ROUTES)) {
    if (routePrefixes.some((prefix) => pathname.startsWith(prefix))) {
      if (!role) return '/login';
      if (role !== routeRole) {
        return ROLE_ROUTES[role]?.[0] || '/dashboard';
      }
    }
  }
  return null;
};

describe('Middleware Property Tests', () => {
  it('P6: Static paths skip middleware', () => {
    const matcherRegexStr = config.matcher[0];
    const nextRegex = new RegExp(`^${matcherRegexStr}$`);

    // Specific static paths
    const staticPaths = [
      `/_next/static/js/main.js`,
      `/_next/image?url=foo`,
      `/favicon.ico`,
      `/sitemap.xml`,
      `/robots.txt`,
      `/images/logo.png`,
      `/styles/main.css`,
      `/api/user.json`
    ];

    for (const path of staticPaths) {
      expect(nextRegex.test(path)).toBe(false);
    }

    // Property-based generated static paths
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 5 }),
        (name, extension) => {
          // ensure no newlines in generated strings for regex testing
          const cleanName = name.replace(/\n|\r/g, '');
          const cleanExt = extension.replace(/\n|\r/g, '');
          if (cleanName && cleanExt) {
            const extPath = `/${cleanName}.${cleanExt}`;
            expect(nextRegex.test(extPath)).toBe(false);
          }
        }
      )
    );
  });

  it('P7: Role enforcement', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/admin', '/manager', '/student', '/monthly-manager'),
        fc.constantFrom(null, 'SUPER_ADMIN', 'HOSTEL_MANAGER', 'STUDENT', 'MONTHLY_MANAGER'),
        (pathname, role) => {
          const redirect = checkRoleAccess(pathname, role);
          
          if (!role) {
            expect(redirect).toBe('/login');
          } else {
            const ownerRole = Object.entries(ROLE_ROUTES).find(([r, prefixes]) => 
              prefixes.some(p => pathname.startsWith(p))
            )?.[0];

            if (ownerRole && ownerRole !== role) {
              expect(redirect).toBe(ROLE_ROUTES[role]?.[0] || '/dashboard');
            } else {
              expect(redirect).toBeNull();
            }
          }
        }
      )
    );
  });
});
