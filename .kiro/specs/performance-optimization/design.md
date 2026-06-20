# Design Document — Performance Optimization

## Overview

Seven targeted, low-refactoring changes eliminate the dominant bottlenecks in the hostel management application. No caching layer is introduced; on-premises Supabase local always serves fresh data. Each section below maps directly to one requirement, describes the concrete code-level change, and shows before/after code sketches.

---

## 1. Convert Dashboard Page to a Server Component (Req 1)

### Problem

`src/app/(dashboard)/admin/page.tsx` has `"use client"` at the top and uses `useEffect` + `fetch("/api/admin/dashboard")` to load data. The browser paints a blank skeleton with a `<Loader2>` spinner before any statistics are visible.

### Solution

Remove `"use client"`, delete the `useState`/`useEffect` block, and make the component an `async` Server Component that calls the dashboard API logic directly (or calls the Route Handler URL via `fetch` with absolute URL if the Route Handler must stay public).

The cleanest approach is to extract the dashboard data-fetching logic into a shared server-side function and call it from both the Route Handler and the page component.

### New File: `src/lib/dashboard-data.ts`

```typescript
import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  stats: { totalHostels: number; totalStudents: number; bedsOccupied: number; pendingPayments: number };
  payments: { totalBilled: number; totalCollected: number; totalPending: number; totalOverdue: number };
  recentActivity: { text: string; date: Date }[];
};

export async function getDashboardData(): Promise<DashboardStats> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [totalHostels, totalStudents, bedsOccupied, billAggregates] = await Promise.all([
    prisma.hostel.count(),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.bedAssignment.count({ where: { status: "ACTIVE" } }),
    // Req 2: DB aggregate instead of JS loop
    prisma.bill.aggregate({
      where: { month, year },
      _sum: { totalAmount: true, paidAmount: true },
    }),
  ]);

  const totalBilled = Number(billAggregates._sum.totalAmount ?? 0);
  const totalCollected = Number(billAggregates._sum.paidAmount ?? 0);
  const totalPending = totalBilled - totalCollected;

  const overdueAgg = await prisma.bill.aggregate({
    where: {
      month,
      year,
      dueDate: { lt: now },
      status: { in: ["GENERATED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    _sum: { totalAmount: true, paidAmount: true },
  });
  const overdueBilled = Number(overdueAgg._sum.totalAmount ?? 0);
  const overduePaid = Number(overdueAgg._sum.paidAmount ?? 0);
  const totalOverdue = overdueBilled - overduePaid;

  const recentUsers = await prisma.user.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    select: { username: true, role: true, createdAt: true },
  });

  return {
    stats: { totalHostels, totalStudents, bedsOccupied, pendingPayments: totalPending },
    payments: { totalBilled, totalCollected, totalPending, totalOverdue },
    recentActivity: recentUsers.map((u) => ({
      text: `New ${u.role.toLowerCase().replace("_", " ")} joined: ${u.username}`,
      date: u.createdAt,
    })),
  };
}
```

### Updated `src/app/(dashboard)/admin/page.tsx`

```typescript
// No "use client" — this is a Server Component
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/dashboard-data";
// ... UI imports unchanged

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let data: DashboardStats | null = null;
  let error: string | null = null;

  try {
    data = await getDashboardData();
  } catch (e) {
    error = "Failed to load dashboard data. Please refresh the page.";
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  // Render stats JSX directly — no loading state needed
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session.user.username}
        </p>
      </div>
      {/* stats grid and payment overview — same JSX as before, data is always present */}
    </div>
  );
}
```

The `useSession()` call for the welcome message is replaced by using the `session` object returned from `auth()` — no client hook needed.

---

## 2. Replace JS Bill Aggregation with DB Aggregates (Req 2)

### Problem

`src/app/api/admin/dashboard/route.ts` loads every `Bill` record for the current month into Node.js memory with `findMany` and accumulates totals in a `for` loop.

### Solution

Replace the `findMany` + loop with two `prisma.bill.aggregate` calls (total and overdue). The shared helper `getDashboardData()` (defined in section 1) already implements this. The Route Handler simply delegates to that helper.

### Updated `src/app/api/admin/dashboard/route.ts`

```typescript
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized", 403);
    }
    const data = await getDashboardData();
    return successResponse(data);
  } catch (error) {
    console.error("[Dashboard Stats Error]", error);
    return errorResponse("Internal server error", 500);
  }
}
```

### Why Two Aggregates Instead of One

A single `prisma.bill.aggregate` over all month bills gives `totalBilled` and `totalCollected`. A second aggregate scoped to `dueDate < now AND status IN (GENERATED, PARTIALLY_PAID, OVERDUE)` computes the overdue subset. Both are single SQL `SELECT SUM(...)` queries — far cheaper than loading potentially hundreds of Bill rows.

---

## 3. Add Select Optimisation to the Auth Helper (Req 3)

### Problem

`src/lib/auth.ts` calls `prisma.user.findUnique({ where: { email } })` with no `select`, so PostgreSQL transfers all 15+ columns including `joiningDate`, `createdAt`, `updatedAt`, `createdBy`, and `passwordHash` on every authenticated request.

### Solution

Add an explicit `select` returning only the nine fields that build the `Session` object.

### Updated `src/lib/auth.ts`

```typescript
import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export interface Session {
  user: {
    id: string;
    email: string;
    role: Role;
    status: string;
    isFirstLogin: boolean;
    isProfileComplete: boolean;
    needsSelfieUpdate: boolean;
    privacyConsentAt: Date | null;
    username: string;
  };
}

export const auth = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    // Req 6.3: no console output in production
    if (process.env.NODE_ENV === "development") {
      console.error("[AUTH] Supabase user missing or has no email", user);
    }
    return null;
  }

  // Req 3.1: select only the nine required columns
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      isFirstLogin: true,
      isProfileComplete: true,
      needsSelfieUpdate: true,
      privacyConsentAt: true,
      username: true,
    },
  });

  if (!dbUser) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[AUTH] User not found in DB for email: ${user.email}`);
    }
    return null;
  }

  // Req 3.3: short-circuit on non-ACTIVE status
  if (dbUser.status !== "ACTIVE") {
    if (process.env.NODE_ENV === "development") {
      console.error(`[AUTH] User not ACTIVE: ${user.email}, status: ${dbUser.status}`);
    }
    return null;
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
      isFirstLogin: dbUser.isFirstLogin,
      isProfileComplete: dbUser.isProfileComplete,
      needsSelfieUpdate: dbUser.needsSelfieUpdate,
      privacyConsentAt: dbUser.privacyConsentAt,
      username: dbUser.username,
    },
  };
});
```

Note: `status` is included in the select because Req 3.3 requires reading it to short-circuit; it is already part of the returned `Session` object.

---

## 4. Reduce Default perPage on the Users API (Req 4)

### Problem

`src/app/api/users/route.ts` defaults `perPage` to `100`. On the admin users page this causes a full-table scan and transfers up to 100 users with three nested assignment relations each on every page load.

### Solution

Change the default to `20` and add a `Math.min(perPage, 100)` cap.

### Change in `src/app/api/users/route.ts` (GET handler only)

```typescript
// Before
const perPage = parseInt(searchParams.get("perPage") || "100", 10);

// After
const rawPerPage = parseInt(searchParams.get("perPage") || "20", 10);
const perPage = Math.min(rawPerPage, 100);
```

The `meta` field is already returned; no change needed there. The `total`, `page`, `perPage`, `totalPages` fields are already present and consistent.

---

## 5. Scope the Middleware Matcher to Non-Static Routes (Req 5)

### Problem

The current matcher `"/((?!_next/static|_next/image|favicon.ico).*)"` does exclude those three patterns at the Next.js routing level, but the middleware function body also has a runtime guard:

```typescript
if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
  return NextResponse.next();
}
```

This means the middleware function is still invoked for paths with file extensions (`.js`, `.css`, `.png`, etc.) because the matcher regex does not exclude them — it only excludes the three hard-coded paths. The `updateSession` call is guarded only at function level, not at the matcher level for those paths.

### Solution

Tighten the `config.matcher` regex to also exclude any path containing a file extension.

### Updated `src/middleware.ts` (config only)

```typescript
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static (static assets)
     *   - _next/image  (image optimisation)
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - any path with a file extension (e.g. .js, .css, .png, .svg)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\..*).*)",
  ],
};
```

With this matcher, Next.js will not invoke the middleware function at all for static files, removing the need for the runtime early-return guard. The runtime guard can remain as defence-in-depth or be removed.

---

## 6. Parallelise Sequential I/O Calls in Auth Helper (Req 6)

### Problem

The two I/O calls in `auth()` are inherently sequential: `supabase.auth.getUser()` must complete before the email is known, so `prisma.user.findUnique` cannot start until Supabase returns. The current implementation is already optimal in that sense — there is no further parallelism available.

The real waste is the production `console.error` and `console.log` calls that execute on every authenticated request. These calls are synchronous I/O against Node.js's stderr/stdout streams on the hot path.

### Solution

Req 6.3 is the high-value change: gate all `console.*` calls behind `process.env.NODE_ENV === "development"`. This is already reflected in the updated `auth.ts` shown in section 3. No architectural change to the I/O order is needed or possible.

The updated auth helper from section 3 satisfies all three acceptance criteria for this requirement:
- AC 6.1: No intermediate awaits between the Supabase call and Prisma call — the code flows directly.
- AC 6.2: No logging between `getUser()` result and `findUnique()` call.
- AC 6.3: All `console.*` calls are wrapped in `process.env.NODE_ENV === "development"` guards.

---

## 7. Convert High-Traffic List Pages from Client to Server Components (Req 7)

### Strategy

Both `/admin/users` and `/admin/billing` mix data fetching (must happen server-side) with interactive elements (search, modals, form submission, delete actions). The pattern is:

```
page.tsx              ← async Server Component, fetches initial data, renders shell
└── UsersTable.tsx    ← "use client", receives initial data as props, handles search/actions
```

This eliminates the client-side loading spinner while keeping interactivity.

### 7a. Admin Users Page

**New file: `src/app/(dashboard)/admin/users/UsersTable.tsx`**

Extract the entire JSX + event handlers from the current `page.tsx` into this Client Component. It accepts `initialUsers: UserData[]` as a prop and manages search/delete state internally.

```typescript
"use client";

import { useState } from "react";

type Props = { initialUsers: UserData[] };

export function UsersTable({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  // ... existing search, delete, and badge logic unchanged
}
```

**Updated `src/app/(dashboard)/admin/users/page.tsx`**

```typescript
// No "use client"
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsersTable } from "./UsersTable";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let users: UserData[] = [];
  let error: string | null = null;

  try {
    const result = await prisma.user.findMany({
      take: 20, // matches new default perPage
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        isProfileComplete: true,
        createdAt: true,
        studentProfile: { select: { fullName: true, mobile: true } },
        hostelAssignments: {
          where: { status: "ACTIVE" },
          include: { hostel: { select: { name: true } } },
        },
        roomAssignments: {
          where: { status: "ACTIVE" },
          include: { room: true },
        },
        bedAssignments: {
          where: { status: "ACTIVE" },
          include: { bed: true },
        },
      },
    });
    users = result as UserData[];
  } catch {
    error = "Failed to load users. Please refresh the page.";
  }

  if (error) {
    return <div className="p-8 text-center text-destructive"><p>{error}</p></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage all system users, managers, and students.</p>
        </div>
      </div>
      <UsersTable initialUsers={users} />
    </div>
  );
}
```

### 7b. Admin Billing Page

The billing page is heavily interactive (hostel selector, tab switching, multiple forms, real-time config fetching). The initial hostel list is the only safe thing to pre-load server-side; everything else depends on the selected hostel and is driven by user interaction.

**Split approach:**

```
page.tsx              ← async Server Component, pre-fetches hostel list
└── BillingContent.tsx ← "use client", receives initialHostels as prop, owns all existing logic
```

**New `src/app/(dashboard)/admin/billing/BillingContent.tsx`**

Move the entire existing `AdminBillingPage` component body here verbatim, rename to `BillingContent`, accept `initialHostels: Hostel[]` as a prop, and replace the `fetchHostels` useEffect with initialisation from props:

```typescript
"use client";

type Props = { initialHostels: { id: string; name: string }[] };

export function BillingContent({ initialHostels }: Props) {
  const [hostels, setHostels] = useState(initialHostels);
  const [selectedHostel, setSelectedHostel] = useState(
    initialHostels[0]?.id ?? ""
  );
  const [isLoading, setIsLoading] = useState(false); // not true — hostels already loaded

  // Remove fetchHostels() useEffect entirely
  // Keep all other useEffects and handlers unchanged
}
```

**Updated `src/app/(dashboard)/admin/billing/page.tsx`**

```typescript
// No "use client"
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BillingContent } from "./BillingContent";

export default async function AdminBillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let hostels: { id: string; name: string }[] = [];
  let error: string | null = null;

  try {
    hostels = await prisma.hostel.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch {
    error = "Failed to load hostels. Please refresh the page.";
  }

  if (error) {
    return <div className="p-8 text-center text-destructive"><p>{error}</p></div>;
  }

  return <BillingContent initialHostels={hostels} />;
}
```

---

## Component & File Map

| File | Change Type | Summary |
|---|---|---|
| `src/lib/auth.ts` | Modify | Add `select` clause; gate `console.*` on dev; satisfy Req 3 + 6 |
| `src/lib/dashboard-data.ts` | New | Shared server function with DB aggregates; satisfies Req 1 + 2 |
| `src/app/api/admin/dashboard/route.ts` | Modify | Delegate to `getDashboardData()`; remove `findMany` loop |
| `src/app/(dashboard)/admin/page.tsx` | Modify | Convert to async Server Component; call `getDashboardData()` directly |
| `src/app/api/users/route.ts` | Modify | Change default `perPage` to 20; add `Math.min(rawPerPage, 100)` cap |
| `src/app/(dashboard)/admin/users/page.tsx` | Modify | Convert to async Server Component; direct Prisma call |
| `src/app/(dashboard)/admin/users/UsersTable.tsx` | New | Client Component holding search/delete interactivity |
| `src/app/(dashboard)/admin/billing/page.tsx` | Modify | Convert to async Server Component; pre-fetch hostel list |
| `src/app/(dashboard)/admin/billing/BillingContent.tsx` | New | Client Component holding all existing billing logic |
| `src/middleware.ts` | Modify | Tighten `config.matcher` to exclude file-extension paths |

---

## Data Models

No schema changes are required. All changes are at the query layer:

- `prisma.bill.aggregate` uses existing indexes `@@index([hostelId, month, year])` and `@@index([status])`.
- `prisma.user.findUnique` with `select` reduces wire transfer from ~15 columns to 9.
- `prisma.user.findMany` on the users page uses the existing `@@index([role, status])`.

---

## Error Handling

All server-side data fetches in Server Components are wrapped in `try/catch`. On failure the component renders a visible error message string rather than throwing to an unhandled boundary. The Route Handler at `/api/admin/dashboard` retains its existing `try/catch` with a 500 response.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: DB Aggregates Match JS Summation

*For any* set of `Bill` records in the database for a given month and year, the values of `totalBilled` and `totalCollected` returned by `getDashboardData()` (using `prisma.bill.aggregate`) SHALL equal the values produced by iterating over those same records and summing `totalAmount` and `paidAmount` in JavaScript.

**Validates: Requirements 2.1, 2.3**

---

### Property 2: Auth Select Returns Exactly the Required Fields

*For any* active user record in the database, the `Session` object returned by `auth()` SHALL contain exactly the fields `id`, `email`, `role`, `status`, `isFirstLogin`, `isProfileComplete`, `needsSelfieUpdate`, `privacyConsentAt`, and `username`, and SHALL NOT contain any other User model fields.

**Validates: Requirements 3.1, 3.2**

---

### Property 3: Non-ACTIVE Users Always Produce Null Session

*For any* user whose `status` is not `"ACTIVE"` (i.e., `"INACTIVE"` or `"SUSPENDED"`), calling `auth()` SHALL return `null` without performing additional queries.

**Validates: Requirements 3.3**

---

### Property 4: perPage Cap Invariant

*For any* integer value of `perPage` supplied as a query parameter to `GET /api/users`, the `take` clause passed to Prisma SHALL equal `min(suppliedValue, 100)`, and when no `perPage` is supplied the `take` SHALL equal `20`.

**Validates: Requirements 4.1, 4.2**

---

### Property 5: Paginated Response Meta Consistency

*For any* query parameters supplied to `GET /api/users`, the response `meta` object SHALL satisfy `totalPages === Math.ceil(total / perPage)` and `page`, `perPage`, `total`, `totalPages` SHALL all be non-negative integers.

**Validates: Requirements 4.3**

---

### Property 6: Static Paths Never Invoke updateSession

*For any* HTTP request whose pathname starts with `/_next/`, contains `/favicon`, or contains a file extension (e.g. `.js`, `.css`, `.png`, `.svg`, `.ico`), the Next.js middleware SHALL NOT invoke `updateSession` and SHALL return immediately with `NextResponse.next()`.

**Validates: Requirements 5.1, 5.2**

---

### Property 7: Role-Protected Routes Enforce Authentication

*For any* pathname that starts with a prefix in the `ROLE_ROUTES` map, an unauthenticated request (no Supabase session) SHALL be redirected to `/login`, and an authenticated request from a user whose role is not in the allowed list SHALL be redirected to that user's own dashboard route.

**Validates: Requirements 5.3**

---

### Property 8: Production Auth Produces No Console Side-Effects

*For any* invocation of `auth()` in an environment where `process.env.NODE_ENV !== "development"`, no `console.log`, `console.error`, or `console.warn` calls SHALL be executed, regardless of whether the authentication succeeds or fails.

**Validates: Requirements 6.3**
