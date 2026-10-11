import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function getUsersList(params: {
  role?: string | null;
  status?: string | null;
  search?: string | null;
  page?: number;
  perPage?: number;
  sortBy?: "name" | "createdAt" | "username" | string | null;
  sortOrder?: "asc" | "desc" | null;
}) {
  const page = params.page || 1;
  const perPageInput = params.perPage || 20; // Default to 20
  const perPage = Math.min(perPageInput, 100); // Max 100

  const where: Prisma.UserWhereInput = {};
  
  if (params.role && params.role !== "ALL") {
    if (params.role.includes(",")) {
      where.role = { in: params.role.split(",") as any };
    } else {
      where.role = params.role as any;
    }
  }
  if (params.status && params.status !== "ALL") where.status = params.status as any;
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { email: { contains: term, mode: "insensitive" } },
      { username: { contains: term, mode: "insensitive" } },
      {
        studentProfile: {
          fullName: { contains: term, mode: "insensitive" }
        }
      }
    ];
  }

  // Order alphabetically by student profile name (or username) if role is STUDENT or sortBy is 'name'
  const isStudentRole = params.role === "STUDENT" || (typeof params.role === "string" && params.role.includes("STUDENT"));
  const shouldSortAlphabetically = params.sortBy === "name" || (isStudentRole && params.sortBy !== "createdAt");

  let orderBy: Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[];
  if (shouldSortAlphabetically) {
    const direction: Prisma.SortOrder = (params.sortOrder as Prisma.SortOrder) || "asc";
    orderBy = [
      { studentProfile: { fullName: direction } },
      { username: direction }
    ];
  } else {
    orderBy = { createdAt: (params.sortOrder as Prisma.SortOrder) || "desc" };
  }

  // Run both queries in parallel instead of sequentially
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        isProfileComplete: true,
        createdAt: true,
        studentProfile: {
          select: {
            fullName: true,
            mobile: true,
          }
        },
        hostelAssignments: {
          where: { status: "ACTIVE" },
          include: {
            hostel: { select: { name: true } }
          }
        },
        managedHostels: {
          where: { isActive: true },
          include: {
            hostel: { select: { name: true } }
          }
        },
        roomAssignments: {
          where: { status: "ACTIVE" },
          include: { room: true }
        },
        bedAssignments: {
          where: { status: "ACTIVE" },
          include: { bed: true }
        }
      },
      orderBy,
    }),
    prisma.user.count({ where })
  ]);

  return {
    data: users,
    meta: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    }
  };
}
