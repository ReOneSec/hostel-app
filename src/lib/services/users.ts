import { prisma } from "@/lib/prisma";

export async function getUsersList(params: {
  role?: string | null;
  status?: string | null;
  search?: string | null;
  page?: number;
  perPage?: number;
}) {
  const page = params.page || 1;
  const perPageInput = params.perPage || 20; // Default to 20
  const perPage = Math.min(perPageInput, 100); // Max 100

  const where: any = {};
  
  if (params.role) {
    if (params.role.includes(",")) {
      where.role = { in: params.role.split(",") };
    } else {
      where.role = params.role;
    }
  }
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: "insensitive" } },
      { username: { contains: params.search, mode: "insensitive" } },
      {
        studentProfile: {
          fullName: { contains: params.search, mode: "insensitive" }
        }
      }
    ];
  }

  const users = await prisma.user.findMany({
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
      roomAssignments: {
        where: { status: "ACTIVE" },
        include: { room: true }
      },
      bedAssignments: {
        where: { status: "ACTIVE" },
        include: { bed: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.user.count({ where });

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
