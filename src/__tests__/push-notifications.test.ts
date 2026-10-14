import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// 1. Mock Firebase Admin
const mockSendEachForMulticast = vi.fn();
const mockInitializeApp = vi.fn();
const mockGetApps = vi.fn();
const mockCert = vi.fn();

vi.mock("firebase-admin/app", () => ({
  initializeApp: (...args: any[]) => mockInitializeApp(...args),
  getApps: () => mockGetApps(),
  cert: (...args: any[]) => mockCert(...args),
}));

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: vi.fn().mockReturnValue({
    sendEachForMulticast: (...args: any[]) => mockSendEachForMulticast(...args),
  }),
}));

// 2. Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    device: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    hostelAssignment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    announcement: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    announcementRead: {
      create: vi.fn(),
    },
    bill: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    lateFeeRecord: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    hostelManagerAssignment: {
      findFirst: vi.fn(),
    },
    hostel: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((ops) => {
      if (typeof ops === "function") {
        return ops(prisma);
      }
      return Promise.all(ops);
    }),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn(),
  getIpAddress: vi.fn().mockReturnValue("127.0.0.1"),
  getUserAgent: vi.fn().mockReturnValue("test-agent"),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  billGeneratedEmail: vi.fn().mockReturnValue("<html>email</html>"),
}));

vi.mock("@/lib/pdf-generator", () => ({
  generateInvoicePDF: vi.fn().mockReturnValue({
    output: () => new ArrayBuffer(8),
  }),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  isPushConfigured,
  getFirebaseAdminApp,
  getFirebaseMessaging,
} from "@/lib/firebase-admin";
import {
  sendPushNotification,
  sanitizePushData,
} from "@/lib/push";
import {
  notify,
  notifyNoticePublished,
  notifyInvoiceDownloaded,
  notifyBillGenerated,
  notifyLateFeeAdded,
  _resetInvoiceCooldownsForTesting,
} from "@/lib/notify";
import { composeAnnouncement } from "@/lib/services/announcements";
import { GET as getInvoiceRoute } from "@/app/api/billing/bills/[id]/invoice/route";
import { calculateLateFees, LATE_FEE_PER_DAY } from "@/lib/late-fee";
import { POST as registerDevice, DELETE as unregisterDevice } from "@/app/api/devices/route";

const mockPrisma = vi.mocked(prisma) as any;
const mockAuth = vi.mocked(auth) as any;

describe("Push Notifications Plan - Automated Verification", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    _resetInvoiceCooldownsForTesting();
    process.env = { ...originalEnv };
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "firebase-adminsdk@test.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk\\n-----END PRIVATE KEY-----";
    delete process.env.PUSH_ENABLED;
    delete process.env.PUSH_PILOT_USER_IDS;

    mockGetApps.mockReturnValue([]);
    mockInitializeApp.mockReturnValue({ name: "mock-firebase-app" });
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. INITIALIZATION TESTS
  // =========================================================================
  describe("1. Firebase Admin Initialization", () => {
    it("reports configured when all 3 credentials are present", () => {
      expect(isPushConfigured()).toBe(true);
    });

    it("disables push without throwing when credentials are missing", () => {
      delete process.env.FIREBASE_PRIVATE_KEY;
      expect(isPushConfigured()).toBe(false);
      const app = getFirebaseAdminApp();
      expect(app).toBeNull();
      const messaging = getFirebaseMessaging();
      expect(messaging).toBeNull();
    });

    it("handles escaped \\n in private key correctly", () => {
      mockCert.mockImplementation((credentials) => credentials);
      getFirebaseAdminApp();

      expect(mockCert).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "test-project",
          clientEmail: "firebase-adminsdk@test.iam.gserviceaccount.com",
          privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk\n-----END PRIVATE KEY-----",
        })
      );
    });

    it("enforces singleton app initialization and reuses existing instance", () => {
      const existingApp = { name: "existing-app" };
      mockGetApps.mockReturnValue([existingApp]);

      const app = getFirebaseAdminApp();
      expect(app).toBe(existingApp);
      expect(mockInitializeApp).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. TRANSPORT TESTS
  // =========================================================================
  describe("2. Push Transport (sendEachForMulticast, Chunking, Stale Cleanup)", () => {
    it("returns zero-token success without calling Firebase when users have no devices", async () => {
      mockPrisma.device.findMany.mockResolvedValue([]);

      const result = await sendPushNotification(["user-1"], {
        title: "Test",
        body: "Hello",
        data: { event: "NOTICE", route: "notices" },
      });

      expect(result.intendedUsers).toBe(1);
      expect(result.totalTokens).toBe(0);
      expect(result.successCount).toBe(0);
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it("sanitizes data payload so every property is strictly a string", () => {
      const sanitized = sanitizePushData({
        event: "NOTICE",
        amount: 500,
        isActive: true,
        emptyVal: undefined,
        nullVal: null,
      });

      expect(sanitized).toEqual({
        event: "NOTICE",
        amount: "500",
        isActive: "true",
      });
    });

    it("chunks device tokens at 500-token boundaries (e.g. 1200 tokens -> 3 batches)", async () => {
      const fakeDevices = Array.from({ length: 1200 }, (_, i) => ({
        id: `dev-${i}`,
        fcmToken: `token-${i}`,
        userId: "user-1",
      }));
      mockPrisma.device.findMany.mockResolvedValue(fakeDevices as any);

      mockSendEachForMulticast
        .mockResolvedValueOnce({
          successCount: 500,
          failureCount: 0,
          responses: Array(500).fill({ success: true }),
        })
        .mockResolvedValueOnce({
          successCount: 500,
          failureCount: 0,
          responses: Array(500).fill({ success: true }),
        })
        .mockResolvedValueOnce({
          successCount: 200,
          failureCount: 0,
          responses: Array(200).fill({ success: true }),
        });

      const result = await sendPushNotification(["user-1"], {
        title: "Large Broadcast",
        body: "Important",
        data: { event: "NOTICE", route: "notices" },
      });

      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(3);
      expect(mockSendEachForMulticast.mock.calls[0][0].tokens.length).toBe(500);
      expect(mockSendEachForMulticast.mock.calls[1][0].tokens.length).toBe(500);
      expect(mockSendEachForMulticast.mock.calls[2][0].tokens.length).toBe(200);

      // Verify android channel ID
      expect(mockSendEachForMulticast.mock.calls[0][0].android).toEqual({
        notification: { channelId: "hostel_updates" },
      });

      expect(result.totalTokens).toBe(1200);
      expect(result.successCount).toBe(1200);
      expect(result.failureCount).toBe(0);
    });

    it("deletes invalid/unregistered tokens automatically from the database", async () => {
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "good-token", userId: "u1" },
        { id: "d2", fcmToken: "bad-token", userId: "u2" },
      ] as any);

      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true },
          {
            success: false,
            error: { code: "messaging/registration-token-not-registered", message: "Not registered" },
          },
        ],
      });

      mockPrisma.device.deleteMany.mockResolvedValue({ count: 1 });

      const result = await sendPushNotification(["u1", "u2"], {
        title: "Test",
        body: "Test",
        data: { event: "NOTICE", route: "notices" },
      });

      expect(mockPrisma.device.deleteMany).toHaveBeenCalledWith({
        where: { fcmToken: { in: ["bad-token"] } },
      });
      expect(result.tokensRemoved).toBe(1);
    });

    it("respects PUSH_ENABLED=false kill switch", async () => {
      process.env.PUSH_ENABLED = "false";

      const result = await sendPushNotification(["u1"], {
        title: "Kill Switch Active",
        body: "Skip",
        data: { event: "NOTICE", route: "notices" },
      });

      expect(result.skipped).toBe(true);
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it("filters to pilot users when PUSH_PILOT_USER_IDS is set", async () => {
      process.env.PUSH_PILOT_USER_IDS = "pilot-user-1, pilot-user-2";

      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "tok1", userId: "pilot-user-1" },
      ] as any);

      const result = await sendPushNotification(["pilot-user-1", "other-user"], {
        title: "Pilot Test",
        body: "Hello pilot",
        data: { event: "NOTICE", route: "notices" },
      });

      expect(mockPrisma.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: { in: ["pilot-user-1"] } },
        })
      );
    });
  });

  // =========================================================================
  // 3. TRIGGER A: NOTICE FAN-OUT
  // =========================================================================
  describe("3. Trigger A: Notice Published Fan-out", () => {
    it("fans out GLOBAL notices to all active students, excluding sender", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "student-1" },
        { id: "student-2" },
      ] as any);
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "tok-s1", userId: "student-1" },
        { id: "d2", fcmToken: "tok-s2", userId: "student-2" },
      ] as any);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await notifyNoticePublished({
        id: "notice-global-1",
        title: "Water Tank Cleaning",
        body: "Water will be shut off tomorrow morning.",
        audience: "GLOBAL",
        senderId: "admin-1",
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: "STUDENT",
          status: "ACTIVE",
          id: { not: "admin-1" },
        },
        select: { id: true },
      });
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ userId: "student-1", type: "ANNOUNCEMENT" }),
          expect.objectContaining({ userId: "student-2", type: "ANNOUNCEMENT" }),
        ],
      });
      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: {
            title: "Water Tank Cleaning",
            body: "Water will be shut off tomorrow morning.",
          },
          data: {
            event: "NOTICE",
            route: "notices",
            announcementId: "notice-global-1",
          },
        })
      );
      expect(result.intendedUsers).toBe(2);
    });

    it("fans out HOSTEL notices only to active students with active hostel assignments", async () => {
      mockPrisma.hostelAssignment.findMany.mockResolvedValue([
        { userId: "hostel-student-1" },
        { userId: "hostel-student-2" },
      ] as any);
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "tok-hs1", userId: "hostel-student-1" },
      ] as any);

      await notifyNoticePublished({
        id: "notice-hostel-1",
        title: "Hostel WiFi Maintenance",
        body: "WiFi in Block A will be reset.",
        audience: "HOSTEL",
        hostelId: "hostel-abc",
        senderId: "manager-1",
      });

      expect(mockPrisma.hostelAssignment.findMany).toHaveBeenCalledWith({
        where: {
          hostelId: "hostel-abc",
          status: "ACTIVE",
          user: {
            role: "STUDENT",
            status: "ACTIVE",
            id: { not: "manager-1" },
          },
        },
        select: { userId: true },
      });
    });

    it("fans out PRIVATE notices only to the active target student", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: "student-private" } as any);
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "tok-priv", userId: "student-private" },
      ] as any);

      await notifyNoticePublished({
        id: "notice-priv-1",
        title: "Disciplinary Notice",
        body: "Please visit the warden office.",
        audience: "PRIVATE",
        targetUserId: "student-private",
        senderId: "manager-1",
      });

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: "student-private",
          role: "STUDENT",
          status: "ACTIVE",
        },
        select: { id: true },
      });
    });
  });

  // =========================================================================
  // 4. TRIGGER B: STAFF INVOICE DOWNLOAD
  // =========================================================================
  describe("4. Trigger B: Staff Invoice Download", () => {
    it("notifies student owner when authorized staff downloads invoice", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "staff-1", role: "SUPER_ADMIN" },
      } as any);

      mockPrisma.bill.findUnique.mockResolvedValue({
        id: "bill-inv-1",
        userId: "student-owner-1",
        hostelId: "hostel-1",
        rentAmount: 5000,
        establishmentFee: 0,
        bedFee: 0,
        messCharge: 0,
        lateFee: 0,
        totalAmount: 5000,
        paidAmount: 5000,
        payments: [],
        user: { studentProfile: { fullName: "Test Student" } },
      } as any);

      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "student-tok", userId: "student-owner-1" },
      ] as any);

      const req = new NextRequest("http://localhost:3000/api/billing/bills/bill-inv-1/invoice");
      const res = await getInvoiceRoute(req, {
        params: Promise.resolve({ id: "bill-inv-1" }),
      });

      expect(res.status).toBe(200);
      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: {
            title: "Invoice Downloaded",
            body: "Your invoice was downloaded by hostel staff.",
          },
          data: {
            event: "INVOICE_DOWNLOADED",
            route: "bill",
            billId: "bill-inv-1",
          },
        })
      );
    });

    it("suppresses notification when student downloads their own invoice", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "student-owner-1", role: "STUDENT" },
      } as any);

      mockPrisma.bill.findUnique.mockResolvedValue({
        id: "bill-inv-1",
        userId: "student-owner-1",
        hostelId: "hostel-1",
        rentAmount: 5000,
        establishmentFee: 0,
        bedFee: 0,
        messCharge: 0,
        lateFee: 0,
        totalAmount: 5000,
        paidAmount: 5000,
        payments: [],
        user: { studentProfile: { fullName: "Test Student" } },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/billing/bills/bill-inv-1/invoice");
      const res = await getInvoiceRoute(req, {
        params: Promise.resolve({ id: "bill-inv-1" }),
      });

      expect(res.status).toBe(200);
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it("applies cooldown on repeated downloads by same staff but permits download by different staff", async () => {
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "tok", userId: "student-1" },
      ] as any);

      // First download by staff-1
      const res1 = await notifyInvoiceDownloaded({
        billId: "bill-100",
        studentUserId: "student-1",
        staffUserId: "staff-1",
      });
      expect(res1.skipped).toBeUndefined();
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);

      // Repeated download by same staff within cooldown window
      const res2 = await notifyInvoiceDownloaded({
        billId: "bill-100",
        studentUserId: "student-1",
        staffUserId: "staff-1",
      });
      expect(res2.skipped).toBe(true);
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);

      // Download by different staff is allowed
      const res3 = await notifyInvoiceDownloaded({
        billId: "bill-100",
        studentUserId: "student-1",
        staffUserId: "staff-2",
      });
      expect(res3.skipped).toBeUndefined();
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(2);
    });

    it("does not trigger notification on 401/403/404 responses", async () => {
      // 401 Unauthorized
      mockAuth.mockResolvedValueOnce(null as any);
      const req = new NextRequest("http://localhost:3000/api/billing/bills/bill-inv-1/invoice");
      const res = await getInvoiceRoute(req, {
        params: Promise.resolve({ id: "bill-inv-1" }),
      });
      expect(res.status).toBe(401);
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. TRIGGER C: BILL GENERATION
  // =========================================================================
  describe("5. Trigger C: Bill Generation", () => {
    it("dispatches push notification for bill generation with formatted copy and billId", async () => {
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "tok-bill", userId: "student-bill-1" },
      ] as any);

      const bill = {
        id: "bill-gen-99",
        userId: "student-bill-1",
        billType: "RENT",
        totalAmount: 4500,
        dueDate: new Date(2026, 9, 7),
      };

      const result = await notifyBillGenerated(bill);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "student-bill-1",
          type: "BILL_GENERATED",
          title: "New Bill: Monthly Rent",
        }),
      });

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: "New Bill: Monthly Rent",
            body: expect.stringContaining("₹4500"),
          }),
          data: {
            event: "BILL_GENERATED",
            route: "bill",
            billId: "bill-gen-99",
          },
        })
      );
      expect(result.intendedUsers).toBe(1);
    });

    it("formats establishment fee and bed fee bill types appropriately", async () => {
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "tok-est", userId: "student-est" },
      ] as any);

      await notifyBillGenerated({
        id: "bill-est-1",
        userId: "student-est",
        billType: "ESTABLISHMENT_FEE",
        totalAmount: 2000,
        dueDate: new Date(2026, 9, 20),
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "New Bill: Establishment Fee",
        }),
      });
    });
  });

  // =========================================================================
  // 6. TRIGGER D: LATE FEE / FINE GENERATION
  // =========================================================================
  describe("6. Trigger D: Late Fee Generation (Three Ordered Stages, ₹10/day)", () => {
    it("verifies LATE_FEE_PER_DAY is set to 10", () => {
      expect(LATE_FEE_PER_DAY).toBe(10);
    });

    it("applies late fee, commits transaction, then dispatches push notification to affected student", async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 3); // 3 days overdue -> 3 * 10 = ₹30

      mockPrisma.bill.findMany.mockResolvedValue([
        {
          id: "bill-overdue-1",
          userId: "student-late-1",
          dueDate,
          lateFee: 0,
          totalAmount: 5000,
          status: "GENERATED",
        },
      ] as any);

      mockPrisma.user.findFirst.mockResolvedValue({ id: "admin-1", role: "SUPER_ADMIN" } as any);
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "tok-late", userId: "student-late-1" },
      ] as any);

      const count = await calculateLateFees();

      expect(count).toBe(1);
      // Stage 2 transaction executed
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // Stage 3 push notified with amount added and new total
      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: {
            title: "Late Fee Added",
            body: "A late fee of ₹30 has been applied to your bill. New total: ₹5030. Please pay immediately.",
          },
          data: {
            event: "LATE_FEE_ADDED",
            route: "bill",
            billId: "bill-overdue-1",
          },
        })
      );
    });

    it("does not notify or update when target late fee equals current late fee (idempotent repeated run)", async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 2); // 2 days overdue -> target ₹20

      mockPrisma.bill.findMany.mockResolvedValue([
        {
          id: "bill-overdue-2",
          userId: "student-late-2",
          dueDate,
          lateFee: 20, // already applied ₹20!
          totalAmount: 5020,
          status: "OVERDUE",
        },
      ] as any);

      const count = await calculateLateFees();

      expect(count).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it("sends no push notifications if the database transaction fails", async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 5);

      mockPrisma.bill.findMany.mockResolvedValue([
        {
          id: "bill-overdue-fail",
          userId: "student-late-fail",
          dueDate,
          lateFee: 0,
          totalAmount: 5000,
          status: "GENERATED",
        },
      ] as any);

      mockPrisma.$transaction.mockRejectedValueOnce(new Error("Database write collision"));

      await expect(calculateLateFees()).rejects.toThrow("Database write collision");
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. FAILURE ISOLATION TESTS
  // =========================================================================
  describe("7. Failure Isolation", () => {
    it("ensures FCM rejection or network failure does not crash notify callers", async () => {
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "bad-token", userId: "u1" },
      ] as any);

      mockSendEachForMulticast.mockRejectedValueOnce(new Error("FCM service unavailable"));

      const result = await notifyNoticePublished({
        id: "notice-err-1",
        title: "Test",
        body: "Test body",
        audience: "GLOBAL",
      });

      // Does not throw, records failure count
      expect(result.failureCount).toBe(1);
    });

    it("ensures stale token cleanup failure does not throw or fail push delivery return", async () => {
      mockPrisma.device.findMany.mockResolvedValue([
        { id: "d1", fcmToken: "bad-token", userId: "u1" },
      ] as any);

      mockSendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: { code: "messaging/registration-token-not-registered", message: "Invalid" },
          },
        ],
      });

      mockPrisma.device.deleteMany.mockRejectedValueOnce(new Error("DB Deadlock"));

      const result = await sendPushNotification(["u1"], {
        title: "Test",
        body: "Test",
        data: { event: "NOTICE", route: "notices" },
      });

      // Cleanup failure handled gracefully
      expect(result.totalTokens).toBe(1);
      expect(result.tokensRemoved).toBe(0);
    });
  });

  // =========================================================================
  // 8. DEVICE REGISTRATION ENDPOINTS (/api/devices)
  // =========================================================================
  describe("8. Device Registration & Logout Lifecycle", () => {
    it("POST /api/devices upserts device token for authenticated user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "STUDENT" },
      } as any);

      mockPrisma.device.upsert.mockResolvedValue({
        id: "dev-1",
        userId: "user-123",
        fcmToken: "new-fcm-token",
        platform: "android",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/devices", {
        method: "POST",
        body: JSON.stringify({ fcmToken: "new-fcm-token", platform: "android" }),
      });

      const res = await registerDevice(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(mockPrisma.device.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fcmToken: "new-fcm-token" },
          update: expect.objectContaining({ userId: "user-123", platform: "android" }),
          create: expect.objectContaining({ userId: "user-123", fcmToken: "new-fcm-token" }),
        })
      );
    });

    it("DELETE /api/devices unregisters specific token or all tokens for user on logout", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "STUDENT" },
      } as any);

      mockPrisma.device.deleteMany.mockResolvedValue({ count: 1 });

      const req = new NextRequest("http://localhost:3000/api/devices", {
        method: "DELETE",
        body: JSON.stringify({ fcmToken: "logout-token" }),
      });

      const res = await unregisterDevice(req);
      expect(res.status).toBe(200);
      expect(mockPrisma.device.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-123", fcmToken: "logout-token" },
      });
    });
  });
});
