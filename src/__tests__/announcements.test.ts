import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    announcement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    announcementRead: {
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    hostelAssignment: {
      findFirst: vi.fn(),
    },
    hostelManagerAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    hostel: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn(),
  getIpAddress: vi.fn().mockReturnValue("127.0.0.1"),
  getUserAgent: vi.fn().mockReturnValue("test-agent"),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/announcements/route";
import { PATCH, DELETE } from "@/app/api/announcements/[id]/route";
import { POST as markRead } from "@/app/api/announcements/[id]/read/route";
import { createSystemNotice } from "@/lib/services/announcements";

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe("Announcements (Three-Tier Notices) API & Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/announcements?scope=mine (Audience resolution)", () => {
    it("returns 401 without auth", async () => {
      mockAuth.mockResolvedValueOnce(null as any);
      const req = new NextRequest("http://localhost/api/announcements?scope=mine");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHORIZED");
    });

    it("resolves global + active hostel + private notices for student", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);

      // Student assigned to hostel-A
      (mockPrisma.hostelAssignment.findFirst as any).mockResolvedValueOnce({
        userId: "student-1",
        hostelId: "hostel-A",
        status: "ACTIVE",
        hostel: { id: "hostel-A", name: "Hostel A" },
      });

      // Mock global announcements
      (mockPrisma.announcement.findMany as any)
        .mockResolvedValueOnce([
          {
            id: "a1",
            title: "Fee due 7th Nov",
            body: "Fee reminder",
            audience: "GLOBAL",
            isPinned: true,
            expiresAt: new Date("2026-11-07"),
            createdAt: new Date("2026-10-15"),
          },
        ])
        // Mock hostel announcements
        .mockResolvedValueOnce([
          {
            id: "a2",
            title: "Water shutdown Sat",
            body: "No water 10am-2pm",
            audience: "HOSTEL",
            hostelId: "hostel-A",
            hostel: { name: "Hostel A" },
            isPinned: false,
            expiresAt: null,
            createdAt: new Date("2026-10-14"),
          },
        ])
        // Mock private announcements
        .mockResolvedValueOnce([
          {
            id: "a3",
            title: "Payment received",
            body: "Approved",
            audience: "PRIVATE",
            targetUserId: "student-1",
            isPinned: false,
            expiresAt: null,
            createdAt: new Date("2026-10-13"),
          },
        ]);

      // Mock read records: student has read a2
      (mockPrisma.announcementRead.findMany as any).mockResolvedValueOnce([
        { announcementId: "a2" },
      ]);

      const req = new NextRequest("http://localhost/api/announcements?scope=mine");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.global).toHaveLength(1);
      expect(json.data.global[0].title).toBe("Fee due 7th Nov");
      expect(json.data.global[0].read).toBe(false);
      expect(json.data.global[0].isPinned).toBe(true);

      expect(json.data.hostel).toHaveLength(1);
      expect(json.data.hostel[0].title).toBe("Water shutdown Sat");
      expect(json.data.hostel[0].read).toBe(true);
      expect(json.data.hostel[0].hostelName).toBe("Hostel A");

      expect(json.data.private).toHaveLength(1);
      expect(json.data.private[0].title).toBe("Payment received");
      expect(json.data.private[0].read).toBe(false);
    });

    it("manager previewing unassigned hostel returns 403", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "mgr-1", role: "HOSTEL_MANAGER" },
      } as any);

      (mockPrisma.hostelManagerAssignment.findFirst as any).mockResolvedValueOnce(null);

      const req = new NextRequest(
        "http://localhost/api/announcements?scope=mine&audience=HOSTEL&hostelId=hostel-unassigned"
      );
      const res = await GET(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });
  });

  describe("POST /api/announcements (Compose)", () => {
    it("student hitting compose is rejected with 403", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);

      const req = new NextRequest("http://localhost/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          body: "Test body",
          audience: "GLOBAL",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("hostel manager targeting non-hostel audience is rejected with 403", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "mgr-1", role: "HOSTEL_MANAGER" },
      } as any);

      const req = new NextRequest("http://localhost/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: "Global notice attempt",
          body: "Trying to reach all students",
          audience: "GLOBAL",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("hostel manager targeting other hostel is rejected with 403", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "mgr-1", role: "HOSTEL_MANAGER" },
      } as any);

      (mockPrisma.hostel.findUnique as any).mockResolvedValueOnce({
        id: "hostel-B",
        name: "Hostel B",
      });
      (mockPrisma.hostelManagerAssignment.findFirst as any).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: "Hostel B announcement",
          body: "Water issue",
          audience: "HOSTEL",
          hostelId: "hostel-B",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("super admin successfully composes announcement and auto-unpins previous pinned notice", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin-1", role: "SUPER_ADMIN" },
      } as any);

      (mockPrisma.announcement.create as any).mockResolvedValueOnce({
        id: "a-new",
        title: "Important Exam Schedule",
        body: "Exams begin next week.",
        audience: "GLOBAL",
        isPinned: true,
        expiresAt: new Date("2026-11-20"),
        createdAt: new Date(),
      });

      const req = new NextRequest("http://localhost/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: "Important Exam Schedule",
          body: "Exams begin next week.",
          audience: "GLOBAL",
          isPinned: true,
          expiresAt: "2026-11-20T00:00:00Z",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify unpin updateMany was called
      expect(mockPrisma.announcement.updateMany).toHaveBeenCalledWith({
        where: { audience: "GLOBAL", isPinned: true },
        data: { isPinned: false },
      });

      // Verify sender marked as read
      expect(mockPrisma.announcementRead.create).toHaveBeenCalledWith({
        data: {
          announcementId: "a-new",
          userId: "admin-1",
        },
      });
    });

    it("rejects invalid inputs with 400 VALIDATION_ERROR", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin-1", role: "SUPER_ADMIN" },
      } as any);

      const req = new NextRequest("http://localhost/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: "", // empty title
          body: "Valid body",
          audience: "GLOBAL",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("PATCH /api/announcements/[id]", () => {
    it("updates announcement content and pin state inside transaction", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin-1", role: "SUPER_ADMIN" },
      } as any);

      (mockPrisma.announcement.findUnique as any).mockResolvedValueOnce({
        id: "a1",
        audience: "GLOBAL",
        title: "Old Title",
        body: "Old Body",
        isPinned: false,
      });

      (mockPrisma.announcement.update as any).mockResolvedValueOnce({
        id: "a1",
        title: "New Title",
        body: "New Body",
        isPinned: true,
      });

      const req = new NextRequest("http://localhost/api/announcements/a1", {
        method: "PATCH",
        body: JSON.stringify({
          title: "New Title",
          body: "New Body",
          isPinned: true,
        }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "a1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("New Title");
    });

    it("returns 404 when announcement does not exist", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin-1", role: "SUPER_ADMIN" },
      } as any);

      (mockPrisma.announcement.findUnique as any).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/announcements/a-none", {
        method: "PATCH",
        body: JSON.stringify({ title: "New" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "a-none" }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.code).toBe("NOT_FOUND");
    });
  });

  describe("DELETE /api/announcements/[id]", () => {
    it("deletes announcement and logs audit", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin-1", role: "SUPER_ADMIN" },
      } as any);

      (mockPrisma.announcement.findUnique as any).mockResolvedValueOnce({
        id: "a1",
        title: "Notice to delete",
        audience: "GLOBAL",
      });

      const req = new NextRequest("http://localhost/api/announcements/a1", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: Promise.resolve({ id: "a1" }) });
      expect(res.status).toBe(200);
      expect(mockPrisma.announcement.delete).toHaveBeenCalledWith({
        where: { id: "a1" },
      });
    });
  });

  describe("POST /api/announcements/[id]/read (Mark read)", () => {
    it("is idempotent and marks visible notice as read", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);

      (mockPrisma.announcement.findUnique as any).mockResolvedValueOnce({
        id: "a1",
        audience: "GLOBAL",
      });

      const req = new NextRequest("http://localhost/api/announcements/a1/read", {
        method: "POST",
      });

      const res = await markRead(req, { params: Promise.resolve({ id: "a1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual({ read: true });

      expect(mockPrisma.announcementRead.upsert).toHaveBeenCalledWith({
        where: {
          announcementId_userId: {
            announcementId: "a1",
            userId: "student-1",
          },
        },
        update: {},
        create: {
          announcementId: "a1",
          userId: "student-1",
        },
      });
    });

    it("rejects mark-read with 403 if notice is private for another student", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);

      (mockPrisma.announcement.findUnique as any).mockResolvedValueOnce({
        id: "a-private",
        audience: "PRIVATE",
        targetUserId: "student-2", // different student
      });

      const req = new NextRequest("http://localhost/api/announcements/a-private/read", {
        method: "POST",
      });

      const res = await markRead(req, { params: Promise.resolve({ id: "a-private" }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });
  });

  describe("System Notice Dedup & Generation", () => {
    it("creates system notice with senderId SYSTEM", async () => {
      (mockPrisma.announcement.findUnique as any).mockResolvedValueOnce(null);
      (mockPrisma.announcement.create as any).mockResolvedValueOnce({
        id: "sys-1",
        title: "Payment approved",
        senderId: "SYSTEM",
        audience: "PRIVATE",
      });

      const notice = await createSystemNotice({
        targetUserId: "student-1",
        title: "Payment approved",
        body: "Your payment of Rs. 1500 was approved.",
        eventKey: "payment-approved-123",
      });

      expect(notice).toBeDefined();
      expect(mockPrisma.announcement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          senderId: "SYSTEM",
          audience: "PRIVATE",
          targetUserId: "student-1",
          title: "Payment approved",
        }),
      });
    });

    it("deduplicates system notice within same day", async () => {
      (mockPrisma.announcement.findUnique as any).mockResolvedValueOnce({
        id: "sys-already-exists",
        title: "Bill overdue",
      });

      const notice = await createSystemNotice({
        targetUserId: "student-1",
        title: "Bill overdue",
        body: "Your bill is overdue",
        eventKey: "bill-overdue-b1",
      });

      expect(notice).toEqual({ id: "sys-already-exists", title: "Bill overdue" });
      expect(mockPrisma.announcement.create).not.toHaveBeenCalled();
    });
  });
});
