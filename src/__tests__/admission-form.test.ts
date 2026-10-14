import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    hostelManagerAssignment: {
      findFirst: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET as getAdmissionFormMe } from "@/app/api/users/me/admission-form/route";
import { GET as getAdmissionFormById } from "@/app/api/users/[id]/admission-form/route";
import {
  buildAdmissionFormPDF,
  loadAdmissionFormAssetsOnServer,
  admissionFormFilename,
  imageUrlToDataUrl,
  isEmbeddableImage,
} from "@/lib/admission-form-pdf";

const mockAuth = vi.mocked(auth);
const mockPrismaUser = vi.mocked(prisma.user);
const mockPrismaManager = vi.mocked(prisma.hostelManagerAssignment);

// 1x1 transparent PNG as base64 data for testing
const TINY_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

function createMockStudent(id = "std-123", name = "Test Student") {
  return {
    id,
    role: "STUDENT",
    username: "teststudent",
    email: "student@mirror.test",
    createdAt: new Date("2026-01-01"),
    privacyConsentAt: new Date("2026-01-02"),
    studentProfile: {
      fullName: name,
      mobile: "9876543210",
      gender: "Male",
      bloodGroup: "O+",
      dob: "2000-01-01",
      personalEmail: "student@mirror.test",
      aadhaarNumber: "1234-5678-9012",
      fatherName: "Father Name",
      motherName: "Mother Name",
      guardianName: "Guardian Name",
      guardianRelation: "Father",
      parentMobile: "9876543211",
      emergencyContactName: "Emergency Name",
      emergencyContactNumber: "9876543212",
      permanentAddress: "123 Test Street, Kolkata",
      chronicIllnesses: "None",
      allergies: "None",
      regularMedications: "None",
    },
    hostelAssignments: [
      {
        status: "ACTIVE",
        assignedAt: new Date("2026-01-01"),
        hostelId: "hostel-1",
        hostel: { id: "hostel-1", name: "Hostel 1" },
      },
    ],
    roomAssignments: [
      {
        status: "ACTIVE",
        assignedAt: new Date("2026-01-01"),
        room: { roomNumber: "101" },
      },
    ],
    bedAssignments: [
      {
        status: "ACTIVE",
        assignedAt: new Date("2026-01-01"),
        bed: { bedLabel: "A" },
      },
    ],
    selfies: [
      {
        isCurrent: true,
        capturedAt: new Date("2026-01-01"),
        fileUrl: "https://example.test/selfie.jpg",
      },
    ],
    documents: [
      {
        id: "doc-1",
        documentType: "AADHAAR_CARD",
        status: "VERIFIED",
        fileUrl: "https://example.test/aadhaar.jpg",
        fileName: "aadhaar.jpg",
        uploadedAt: new Date("2026-01-01"),
        verifiedAt: new Date("2026-01-02"),
        verifierName: "Admin Verifier",
      },
    ],
  };
}

describe("Admission-Form PDF Endpoint & Generator", () => {
  const originalEnv = process.env.APP_BASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://example.test";
  });

  afterEach(() => {
    process.env.APP_BASE_URL = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Route tests: GET /api/users/me/admission-form", () => {
    it("returns 401 without auth", async () => {
      mockAuth.mockResolvedValueOnce(null as any);

      const req = new NextRequest("https://example.test/api/users/me/admission-form");
      const res = await getAdmissionFormMe(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    });

    it("returns 403 for an authenticated non-student", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin-1", role: "SUPER_ADMIN" },
      } as any);

      const req = new NextRequest("https://example.test/api/users/me/admission-form");
      const res = await getAdmissionFormMe(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: "Forbidden",
        code: "FORBIDDEN",
      });
    });

    it("returns 404 when the student row is absent", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "std-404", role: "STUDENT" },
      } as any);
      mockPrismaUser.findUnique.mockResolvedValueOnce(null);

      const req = new NextRequest("https://example.test/api/users/me/admission-form");
      const res = await getAdmissionFormMe(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: "Student not found",
        code: "NOT_FOUND",
      });
    });

    it("returns 500 INTERNAL when Prisma query fails", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "std-1", role: "STUDENT" },
      } as any);
      mockPrismaUser.findUnique.mockRejectedValueOnce(new Error("Database connection lost"));

      const req = new NextRequest("https://example.test/api/users/me/admission-form");
      const res = await getAdmissionFormMe(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: "Internal server error",
        code: "INTERNAL",
      });
    });

    it("returns 500 PDF_GENERATION_FAILED when APP_BASE_URL is missing", async () => {
      delete process.env.APP_BASE_URL;

      mockAuth.mockResolvedValueOnce({
        user: { id: "std-1", role: "STUDENT" },
      } as any);
      mockPrismaUser.findUnique.mockResolvedValueOnce(createMockStudent("std-1") as any);

      const req = new NextRequest("https://example.test/api/users/me/admission-form");
      const res = await getAdmissionFormMe(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: "Failed to generate admission form PDF",
        code: "PDF_GENERATION_FAILED",
      });
    });

    it("returns 200, PDF headers, and raw PDF bytes beginning with %PDF on success", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "std-1", role: "STUDENT" },
      } as any);
      mockPrismaUser.findUnique.mockResolvedValueOnce(createMockStudent("std-1", "Rahul Sharma") as any);

      // Mock fetch for images to return valid test PNG
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(TINY_PNG_BUFFER, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      });

      const req = new NextRequest("https://example.test/api/users/me/admission-form");
      const res = await getAdmissionFormMe(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="Admission_Form_Rahul_Sharma.pdf"'
      );
      expect(res.headers.get("cache-control")).toBe("private, no-store");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("content-length")).toBeTruthy();

      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const header = new TextDecoder().decode(bytes.slice(0, 4));
      expect(header).toBe("%PDF");
    });
  });

  describe("Builder and asset tests", () => {
    it("fixture with no media produces a valid document without errors", async () => {
      const student = createMockStudent("std-no-media");
      student.selfies = [];
      student.documents = [];

      const doc = await buildAdmissionFormPDF(student, {
        selfieDataUrl: null,
        qrDataUrl: "data:image/png;base64," + TINY_PNG_BUFFER.toString("base64"),
        attachmentDataUrls: new Map(),
      });

      expect(doc).toBeDefined();
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("approved fixture selects the approved stamp and pending fixture selects pending stamp", async () => {
      // Approved student
      const approvedStudent = createMockStudent("std-app");
      approvedStudent.documents = [
        {
          id: "doc-1",
          documentType: "AADHAAR_CARD",
          status: "APPROVED",
          fileUrl: "https://example.test/doc.png",
          fileName: "doc.png",
          uploadedAt: new Date(),
          verifiedAt: new Date(),
          verifierName: "Manager One",
        },
      ];

      const docApproved = await buildAdmissionFormPDF(approvedStudent, {
        selfieDataUrl: null,
        qrDataUrl: "",
        attachmentDataUrls: new Map(),
      });
      expect(docApproved.getNumberOfPages()).toBeGreaterThanOrEqual(1);

      // Pending student
      const pendingStudent = createMockStudent("std-pend");
      pendingStudent.documents = [
        {
          id: "doc-2",
          documentType: "AADHAAR_CARD",
          status: "PENDING",
          fileUrl: "https://example.test/doc.png",
          fileName: "doc.png",
          uploadedAt: new Date(),
          verifiedAt: null as any,
          verifierName: "Pending",
        },
      ];

      const docPending = await buildAdmissionFormPDF(pendingStudent, {
        selfieDataUrl: null,
        qrDataUrl: "",
        attachmentDataUrls: new Map(),
      });
      expect(docPending.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("QR code uses APP_BASE_URL plus /verify/<id>", async () => {
      process.env.APP_BASE_URL = "https://custom.mirrorhostels.com";
      const student = createMockStudent("student-999");
      student.documents = [];
      student.selfies = [];

      const assets = await loadAdmissionFormAssetsOnServer(student);
      expect(assets.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it("imageUrlToDataUrl converts JPEG/PNG bytes to correct data URLs", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => {
        return new Response(TINY_PNG_BUFFER, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      });

      const dataUrl = await imageUrlToDataUrl("https://example.test/image.png");
      expect(dataUrl).toBe(`data:image/png;base64,${TINY_PNG_BUFFER.toString("base64")}`);
    });

    it("broken selfie renders placeholder and returns 200", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "std-1", role: "STUDENT" },
      } as any);

      const student = createMockStudent("std-1");
      mockPrismaUser.findUnique.mockResolvedValueOnce(student as any);

      // Fetch fails for selfie (500), success for attachment
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        if (String(url).includes("selfie")) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(TINY_PNG_BUFFER, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      });

      const req = new NextRequest("https://example.test/api/users/me/admission-form");
      const res = await getAdmissionFormMe(req);

      expect(res.status).toBe(200);
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    });

    it("one broken attachment is skipped while response remains 200", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "std-1", role: "STUDENT" },
      } as any);

      const student = createMockStudent("std-1");
      student.documents.push({
        id: "doc-broken",
        documentType: "OTHER",
        status: "PENDING",
        fileUrl: "https://example.test/broken.png",
        fileName: "broken.png",
        uploadedAt: new Date(),
        verifiedAt: null as any,
        verifierName: "Pending",
      });

      mockPrismaUser.findUnique.mockResolvedValueOnce(student as any);

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        if (String(url).includes("broken")) {
          return new Response("Broken file", { status: 500 });
        }
        return new Response(TINY_PNG_BUFFER, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      });

      const req = new NextRequest("https://example.test/api/users/me/admission-form");
      const res = await getAdmissionFormMe(req);

      expect(res.status).toBe(200);
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    });

    it("PDF attachment is never fetched or embedded", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(TINY_PNG_BUFFER, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      });

      const student = createMockStudent("std-1");
      student.selfies = [];
      student.documents = [
        {
          id: "doc-pdf",
          documentType: "COLLEGE_ID",
          status: "APPROVED",
          fileUrl: "https://example.test/id.pdf",
          fileName: "id.pdf",
          uploadedAt: new Date(),
          verifiedAt: new Date(),
          verifierName: "Verifier",
        },
      ];

      expect(isEmbeddableImage(student.documents[0])).toBe(false);

      const assets = await loadAdmissionFormAssetsOnServer(student);
      expect(assets.attachmentDataUrls.has("doc-pdf")).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalledWith("https://example.test/id.pdf", expect.anything());
    });

    it("sanitizes filename correctly with spaces and special characters", () => {
      expect(admissionFormFilename({ studentProfile: { fullName: "A B C" } })).toBe(
        "Admission_Form_A_B_C.pdf"
      );
      expect(admissionFormFilename({ studentProfile: { fullName: "Special!@#%^&*()Name" } })).toBe(
        "Admission_Form_SpecialName.pdf"
      );
      expect(admissionFormFilename({})).toBe("Admission_Form_Student.pdf");
    });
  });

  describe("Staff download route: GET /api/users/[id]/admission-form", () => {
    it("student can download own form (targetUserId === session.user.id)", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "std-1", role: "STUDENT" },
      } as any);
      mockPrismaUser.findUnique.mockResolvedValueOnce(createMockStudent("std-1") as any);

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(TINY_PNG_BUFFER, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      });

      const req = new NextRequest("https://example.test/api/users/std-1/admission-form");
      const res = await getAdmissionFormById(req, { params: Promise.resolve({ id: "std-1" }) });

      expect(res.status).toBe(200);
    });

    it("student cannot download other student's form (403 FORBIDDEN)", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "std-1", role: "STUDENT" },
      } as any);

      const req = new NextRequest("https://example.test/api/users/std-2/admission-form");
      const res = await getAdmissionFormById(req, { params: Promise.resolve({ id: "std-2" }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("hostel manager with active overlap can download student form", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "mgr-1", role: "HOSTEL_MANAGER" },
      } as any);
      mockPrismaUser.findUnique.mockResolvedValueOnce(createMockStudent("std-1") as any);
      mockPrismaManager.findFirst.mockResolvedValueOnce({
        id: "hma-1",
        userId: "mgr-1",
        hostelId: "hostel-1",
        isActive: true,
      } as any);

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(TINY_PNG_BUFFER, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      });

      const req = new NextRequest("https://example.test/api/users/std-1/admission-form");
      const res = await getAdmissionFormById(req, { params: Promise.resolve({ id: "std-1" }) });

      expect(res.status).toBe(200);
    });

    it("hostel manager without active overlap is rejected with 403", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "mgr-1", role: "HOSTEL_MANAGER" },
      } as any);
      mockPrismaUser.findUnique.mockResolvedValueOnce(createMockStudent("std-1") as any);
      mockPrismaManager.findFirst.mockResolvedValueOnce(null);

      const req = new NextRequest("https://example.test/api/users/std-1/admission-form");
      const res = await getAdmissionFormById(req, { params: Promise.resolve({ id: "std-1" }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("super-admin can download any student form", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin-1", role: "SUPER_ADMIN" },
      } as any);
      mockPrismaUser.findUnique.mockResolvedValueOnce(createMockStudent("std-1") as any);

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(TINY_PNG_BUFFER, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      });

      const req = new NextRequest("https://example.test/api/users/std-1/admission-form");
      const res = await getAdmissionFormById(req, { params: Promise.resolve({ id: "std-1" }) });

      expect(res.status).toBe(200);
    });

    it("monthly-manager can download any student form", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "m-mgr-1", role: "MONTHLY_MANAGER" },
      } as any);
      mockPrismaUser.findUnique.mockResolvedValueOnce(createMockStudent("std-1") as any);

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response(TINY_PNG_BUFFER, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      });

      const req = new NextRequest("https://example.test/api/users/std-1/admission-form");
      const res = await getAdmissionFormById(req, { params: Promise.resolve({ id: "std-1" }) });

      expect(res.status).toBe(200);
    });
  });
});
