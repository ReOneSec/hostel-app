import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { format } from "date-fns";
import type { AnnouncementAudience, Role } from "@prisma/client";

export interface MineAnnouncementsResult {
  global: FormattedAnnouncement[];
  hostel: FormattedAnnouncement[];
  private: FormattedAnnouncement[];
}

export interface FormattedAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  hostelId?: string;
  hostelName?: string;
  isPinned: boolean;
  expiresAt: string | null;
  read: boolean;
  createdAt: string;
}

export async function getMineAnnouncements({
  userId,
  role,
  previewAudience,
  previewHostelId,
  includeExpired = false,
}: {
  userId: string;
  role: Role;
  previewAudience?: string | null;
  previewHostelId?: string | null;
  includeExpired?: boolean;
}): Promise<MineAnnouncementsResult> {
  const now = new Date();
  const expiryFilter = includeExpired
    ? {}
    : {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      };

  let targetHostelId: string | null = null;
  let targetHostelName: string | undefined = undefined;

  if (role === "STUDENT") {
    const activeAssignment = await prisma.hostelAssignment.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { hostel: true },
      orderBy: { assignedAt: "desc" },
    });
    targetHostelId = activeAssignment?.hostelId || null;
    targetHostelName = activeAssignment?.hostel?.name;
  } else if (previewAudience === "HOSTEL" && previewHostelId) {
    // Manager/Admin previewing a hostel
    if (role === "HOSTEL_MANAGER") {
      const assignment = await prisma.hostelManagerAssignment.findFirst({
        where: { userId, hostelId: previewHostelId, isActive: true },
      });
      if (!assignment) {
        throw new Error("FORBIDDEN");
      }
    }
    targetHostelId = previewHostelId;
    const hostel = await prisma.hostel.findUnique({ where: { id: previewHostelId } });
    targetHostelName = hostel?.name;
  } else if (role === "HOSTEL_MANAGER") {
    // If manager calls without previewHostelId, grab their first managed hostel for preview
    const managed = await prisma.hostelManagerAssignment.findFirst({
      where: { userId, isActive: true },
      include: { hostel: true },
    });
    targetHostelId = managed?.hostelId || null;
    targetHostelName = managed?.hostel?.name;
  }

  const [globalNotices, hostelNotices, privateNotices] = await Promise.all([
    // Tier 1: Global
    prisma.announcement.findMany({
      where: {
        audience: "GLOBAL",
        ...expiryFilter,
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    }),
    // Tier 2: Hostel
    targetHostelId
      ? prisma.announcement.findMany({
          where: {
            audience: "HOSTEL",
            hostelId: targetHostelId,
            ...expiryFilter,
          },
          include: { hostel: true },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    // Tier 3: Private
    role === "STUDENT"
      ? prisma.announcement.findMany({
          where: {
            audience: "PRIVATE",
            targetUserId: userId,
            ...expiryFilter,
          },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
  ]);

  const allIds = [
    ...globalNotices.map((n) => n.id),
    ...hostelNotices.map((n) => n.id),
    ...privateNotices.map((n) => n.id),
  ];

  const reads = await prisma.announcementRead.findMany({
    where: { userId, announcementId: { in: allIds } },
    select: { announcementId: true },
  });
  const readSet = new Set(reads.map((r) => r.announcementId));

  const formatItem = (n: any): FormattedAnnouncement => ({
    id: n.id,
    title: n.title,
    body: n.body,
    audience: n.audience,
    ...(n.hostelId
      ? { hostelId: n.hostelId, hostelName: n.hostel?.name || targetHostelName }
      : {}),
    isPinned: Boolean(n.isPinned),
    expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
    read: readSet.has(n.id),
    createdAt: n.createdAt.toISOString(),
  });

  return {
    global: globalNotices.map(formatItem),
    hostel: hostelNotices.map(formatItem),
    private: privateNotices.map(formatItem),
  };
}

export async function composeAnnouncement({
  senderId,
  senderRole,
  data,
  ipAddress,
  userAgent,
}: {
  senderId: string;
  senderRole: Role;
  data: {
    title: string;
    body: string;
    audience: AnnouncementAudience;
    hostelId?: string | null;
    targetUserId?: string | null;
    isPinned?: boolean;
    expiresAt?: string | null;
  };
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const title = data.title?.trim();
  const body = data.body?.trim();
  const audience = data.audience;

  if (!title || title.length > 120) {
    throw new Error("VALIDATION_ERROR: Title must be between 1 and 120 characters");
  }

  if (!body || body.length > 2000) {
    throw new Error("VALIDATION_ERROR: Body must be between 1 and 2,000 characters");
  }

  if (!["GLOBAL", "HOSTEL", "PRIVATE"].includes(audience)) {
    throw new Error("VALIDATION_ERROR: Invalid audience");
  }

  // Authorization checks
  if (senderRole === "STUDENT") {
    throw new Error("FORBIDDEN: Students cannot compose notices");
  }

  if (senderRole === "HOSTEL_MANAGER") {
    if (audience !== "HOSTEL") {
      throw new Error("FORBIDDEN: Hostel Managers can only send HOSTEL announcements");
    }
  }

  let hostelId: string | null = null;
  let targetUserId: string | null = null;

  if (audience === "HOSTEL") {
    if (!data.hostelId) {
      throw new Error("VALIDATION_ERROR: hostelId is required for HOSTEL announcements");
    }
    const hostel = await prisma.hostel.findUnique({ where: { id: data.hostelId } });
    if (!hostel) {
      throw new Error("VALIDATION_ERROR: Specified hostel does not exist");
    }

    if (senderRole === "HOSTEL_MANAGER") {
      const assignment = await prisma.hostelManagerAssignment.findFirst({
        where: { userId: senderId, hostelId: data.hostelId, isActive: true },
      });
      if (!assignment) {
        throw new Error("FORBIDDEN: Manager not assigned to this hostel");
      }
    }

    hostelId = data.hostelId;
  } else if (audience === "PRIVATE") {
    if (!data.targetUserId) {
      throw new Error("VALIDATION_ERROR: targetUserId is required for PRIVATE announcements");
    }
    const student = await prisma.user.findUnique({
      where: { id: data.targetUserId },
      include: {
        hostelAssignments: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!student || student.role !== "STUDENT" || student.status !== "ACTIVE") {
      throw new Error("VALIDATION_ERROR: Target must be an active student");
    }

    if (senderRole === "HOSTEL_MANAGER") {
      const studentHostelId = student.hostelAssignments[0]?.hostelId;
      if (!studentHostelId) {
        throw new Error("FORBIDDEN: Student has no active hostel assignment");
      }
      const assignment = await prisma.hostelManagerAssignment.findFirst({
        where: { userId: senderId, hostelId: studentHostelId, isActive: true },
      });
      if (!assignment) {
        throw new Error("FORBIDDEN: Student is not in your managed hostel");
      }
    }

    targetUserId = data.targetUserId;
  }

  let expiresAtDate: Date | null = null;
  if (data.expiresAt) {
    expiresAtDate = new Date(data.expiresAt);
    if (isNaN(expiresAtDate.getTime()) || expiresAtDate <= new Date()) {
      throw new Error("VALIDATION_ERROR: Expiry date must be in the future");
    }
  }

  const isPinned = Boolean(data.isPinned);

  const announcement = await prisma.$transaction(async (tx) => {
    // If pinning, auto-unpin any other announcement in the same scope
    if (isPinned) {
      if (audience === "GLOBAL") {
        await tx.announcement.updateMany({
          where: { audience: "GLOBAL", isPinned: true },
          data: { isPinned: false },
        });
      } else if (audience === "HOSTEL" && hostelId) {
        await tx.announcement.updateMany({
          where: { audience: "HOSTEL", hostelId, isPinned: true },
          data: { isPinned: false },
        });
      } else if (audience === "PRIVATE" && targetUserId) {
        await tx.announcement.updateMany({
          where: { audience: "PRIVATE", targetUserId, isPinned: true },
          data: { isPinned: false },
        });
      }
    }

    const created = await tx.announcement.create({
      data: {
        title,
        body,
        audience,
        hostelId,
        targetUserId,
        senderId,
        isPinned,
        expiresAt: expiresAtDate,
      },
      include: { hostel: true },
    });

    // Mark sender as having read it (no self-notification)
    await tx.announcementRead.create({
      data: {
        announcementId: created.id,
        userId: senderId,
      },
    });

    return created;
  });

  // Audit log
  await createAuditLog({
    userId: senderId,
    action: "ANNOUNCEMENT_CREATE",
    entity: "Announcement",
    entityId: announcement.id,
    newValues: {
      title,
      audience,
      hostelId,
      targetUserId,
      isPinned,
      expiresAt: expiresAtDate,
    },
    ipAddress,
    userAgent,
  });

  return announcement;
}

export async function updateAnnouncement({
  announcementId,
  senderId,
  senderRole,
  data,
  ipAddress,
  userAgent,
}: {
  announcementId: string;
  senderId: string;
  senderRole: Role;
  data: {
    title?: string;
    body?: string;
    isPinned?: boolean;
    expiresAt?: string | null;
  };
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const existing = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });

  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  // Authorization check
  if (senderRole === "STUDENT") {
    throw new Error("FORBIDDEN");
  }

  if (senderRole === "HOSTEL_MANAGER") {
    if (existing.senderId !== senderId) {
      throw new Error("FORBIDDEN: You can only edit announcements you sent");
    }
    if (existing.hostelId) {
      const assignment = await prisma.hostelManagerAssignment.findFirst({
        where: { userId: senderId, hostelId: existing.hostelId, isActive: true },
      });
      if (!assignment) {
        throw new Error("FORBIDDEN: Not assigned to this hostel");
      }
    }
  }

  const updatePayload: any = {};

  if (data.title !== undefined) {
    const t = data.title.trim();
    if (!t || t.length > 120) {
      throw new Error("VALIDATION_ERROR: Title must be between 1 and 120 characters");
    }
    updatePayload.title = t;
  }

  if (data.body !== undefined) {
    const b = data.body.trim();
    if (!b || b.length > 2000) {
      throw new Error("VALIDATION_ERROR: Body must be between 1 and 2,000 characters");
    }
    updatePayload.body = b;
  }

  if (data.expiresAt !== undefined) {
    if (data.expiresAt === null) {
      updatePayload.expiresAt = null;
    } else {
      const exp = new Date(data.expiresAt);
      if (isNaN(exp.getTime()) || exp <= new Date()) {
        throw new Error("VALIDATION_ERROR: Expiry date must be in the future");
      }
      updatePayload.expiresAt = exp;
    }
  }

  const isPinned = data.isPinned;
  if (isPinned !== undefined) {
    updatePayload.isPinned = Boolean(isPinned);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (isPinned === true) {
      // Auto-unpin other announcements in same scope
      if (existing.audience === "GLOBAL") {
        await tx.announcement.updateMany({
          where: { audience: "GLOBAL", isPinned: true, id: { not: existing.id } },
          data: { isPinned: false },
        });
      } else if (existing.audience === "HOSTEL" && existing.hostelId) {
        await tx.announcement.updateMany({
          where: {
            audience: "HOSTEL",
            hostelId: existing.hostelId,
            isPinned: true,
            id: { not: existing.id },
          },
          data: { isPinned: false },
        });
      } else if (existing.audience === "PRIVATE" && existing.targetUserId) {
        await tx.announcement.updateMany({
          where: {
            audience: "PRIVATE",
            targetUserId: existing.targetUserId,
            isPinned: true,
            id: { not: existing.id },
          },
          data: { isPinned: false },
        });
      }
    }

    return await tx.announcement.update({
      where: { id: announcementId },
      data: updatePayload,
      include: { hostel: true },
    });
  });

  await createAuditLog({
    userId: senderId,
    action: "ANNOUNCEMENT_UPDATE",
    entity: "Announcement",
    entityId: announcementId,
    oldValues: {
      title: existing.title,
      body: existing.body,
      isPinned: existing.isPinned,
      expiresAt: existing.expiresAt,
    },
    newValues: updatePayload,
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function deleteAnnouncement({
  announcementId,
  senderId,
  senderRole,
  ipAddress,
  userAgent,
}: {
  announcementId: string;
  senderId: string;
  senderRole: Role;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const existing = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });

  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  if (senderRole === "STUDENT") {
    throw new Error("FORBIDDEN");
  }

  if (senderRole === "HOSTEL_MANAGER") {
    if (existing.senderId !== senderId) {
      throw new Error("FORBIDDEN: You can only delete announcements you sent");
    }
  }

  await prisma.announcement.delete({
    where: { id: announcementId },
  });

  await createAuditLog({
    userId: senderId,
    action: "ANNOUNCEMENT_DELETE",
    entity: "Announcement",
    entityId: announcementId,
    oldValues: {
      title: existing.title,
      audience: existing.audience,
      hostelId: existing.hostelId,
      targetUserId: existing.targetUserId,
    },
    ipAddress,
    userAgent,
  });

  return { success: true };
}

export async function markAnnouncementRead({
  announcementId,
  userId,
  userRole,
}: {
  announcementId: string;
  userId: string;
  userRole: Role;
}) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });

  if (!announcement) {
    throw new Error("NOT_FOUND");
  }

  // Check visibility for students
  if (userRole === "STUDENT") {
    if (announcement.audience === "PRIVATE" && announcement.targetUserId !== userId) {
      throw new Error("FORBIDDEN");
    }
    if (announcement.audience === "HOSTEL") {
      const activeAssignment = await prisma.hostelAssignment.findFirst({
        where: { userId, status: "ACTIVE", hostelId: announcement.hostelId || "" },
      });
      if (!activeAssignment) {
        throw new Error("FORBIDDEN");
      }
    }
  }

  // Idempotent record in AnnouncementRead
  await prisma.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId,
        userId,
      },
    },
    update: {},
    create: {
      announcementId,
      userId,
    },
  });

  return { read: true };
}

export async function createSystemNotice({
  targetUserId,
  title,
  body,
  eventKey,
  dedupKey,
}: {
  targetUserId: string;
  title: string;
  body: string;
  eventKey: string;
  dedupKey?: string;
}) {
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const idempotencyKey = dedupKey || `system:${eventKey}:${targetUserId}:${dateStr}`;

  try {
    const existing = await prisma.announcement.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    return await prisma.announcement.create({
      data: {
        title: title.slice(0, 120),
        body: body.slice(0, 2000),
        audience: "PRIVATE",
        targetUserId,
        senderId: "SYSTEM",
        isPinned: false,
        idempotencyKey,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return null;
    }
    console.error("[System Notice Error]", error);
    return null;
  }
}

export async function getSentAnnouncements({
  senderId,
  senderRole,
  audience,
  search,
}: {
  senderId: string;
  senderRole: Role;
  audience?: string | null;
  search?: string | null;
}) {
  const whereClause: any = {};

  if (senderRole === "HOSTEL_MANAGER") {
    // Only see announcements for managed hostels or sent by self
    const managed = await prisma.hostelManagerAssignment.findMany({
      where: { userId: senderId, isActive: true },
      select: { hostelId: true },
    });
    const hostelIds = managed.map((m) => m.hostelId);

    whereClause.OR = [
      { senderId },
      { hostelId: { in: hostelIds } },
    ];
  }

  if (audience && ["GLOBAL", "HOSTEL", "PRIVATE"].includes(audience)) {
    whereClause.audience = audience;
  }

  if (search?.trim()) {
    const s = search.trim();
    whereClause.AND = [
      ...(whereClause.AND || []),
      {
        OR: [
          { title: { contains: s, mode: "insensitive" } },
          { body: { contains: s, mode: "insensitive" } },
        ],
      },
    ];
  }

  const items = await prisma.announcement.findMany({
    where: whereClause,
    include: {
      hostel: true,
      targetUser: {
        include: { studentProfile: true },
      },
      _count: {
        select: { reads: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return items;
}
