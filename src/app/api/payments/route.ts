import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  uploadFile,
  validateMimeType,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/storage";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"].includes(user.role)) {
      return errorResponse("Unauthorized", 403, "FORBIDDEN");
    }

    const contentType = req.headers.get("content-type") || "";
    let billId = "";
    let amount = "";
    let transactionId = "";
    let utrNumber = "";
    let paymentDate = "";
    let categories: any[] = ["ALL"];
    let proofFileUrl: string | null = null;
    let file: File | null = null;

    if (contentType.includes("application/json")) {
      const json = await req.json();
      billId = json.billId;
      amount = String(json.amount ?? "");
      transactionId = json.transactionId ?? "";
      utrNumber = json.utrNumber ?? "";
      paymentDate = json.paymentDate;
      if (Array.isArray(json.categories)) categories = json.categories;
      proofFileUrl = json.proofFileUrl || null;
    } else {
      const formData = await req.formData();
      file = formData.get("file") as File | null;
      billId = (formData.get("billId") as string) || "";
      amount = (formData.get("amount") as string) || "";
      transactionId = (formData.get("transactionId") as string) || "";
      utrNumber = (formData.get("utrNumber") as string) || "";
      paymentDate = (formData.get("paymentDate") as string) || "";
      proofFileUrl = (formData.get("proofFileUrl") as string) || null;
      const categoriesString = formData.get("categories") as string;
      if (categoriesString) {
        try {
          categories = JSON.parse(categoriesString);
        } catch {}
      }
    }

    if (!billId || !amount || !paymentDate || (!file && !proofFileUrl)) {
      return errorResponse("Missing required fields including proof image or proofFileUrl", 400, "VALIDATION_ERROR");
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return errorResponse("Invalid payment amount", 400, "VALIDATION_ERROR");
    }

    // Verify the bill belongs to the student
    const bill = await prisma.bill.findUnique({
      where: { id: billId }
    });

    if (!bill || bill.userId !== user.id) {
      return errorResponse("Invalid bill", 400, "VALIDATION_ERROR");
    }

    // If file is provided, upload it
    if (file) {
      if (!validateMimeType(file.type, ALLOWED_IMAGE_TYPES)) {
        return errorResponse(
          "Invalid file type. Only JPG, PNG, and WebP images are allowed.",
          400,
          "VALIDATION_ERROR"
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return errorResponse("File size must be under 5MB", 400, "VALIDATION_ERROR");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/bill_${billId}_${Date.now()}.${ext}`;

      try {
        const result = await uploadFile("payments", path, buffer, file.type);
        proofFileUrl = result.url;
      } catch {
        proofFileUrl = `/uploads/payments/${path}`;
        console.warn("[Payments] Storage upload fallback used");
      }
    }

    const payment = await prisma.payment.create({
      data: {
        billId,
        userId: user.id,
        amount: parsedAmount,
        transactionId: transactionId || null,
        utrNumber: utrNumber || null,
        proofFileUrl,
        paymentDate: new Date(paymentDate),
        categories: categories as any[],
        status: "PENDING_REVIEW"
      }
    });

    await createAuditLog({
      userId: session.user.id,
      action: "PAYMENT_UPLOADED",
      entity: "Payment",
      entityId: payment.id,
      newValues: {
        billId,
        amount: parsedAmount,
        proofFileUrl,
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(payment, 201);
  } catch (error: any) {
    console.error("Error submitting payment:", error);
    return errorResponse("Failed to submit payment", 500, "INTERNAL");
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["SUPER_ADMIN", "HOSTEL_MANAGER"].includes(user.role)) {
      return errorResponse("Unauthorized", 403, "FORBIDDEN");
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const hostelId = searchParams.get("hostelId");

    const where: any = {};
    if (status) where.status = status;
    if (hostelId) {
      where.bill = {
        hostelId
      };
    }

    // For HOSTEL_MANAGER, restrict to their assigned hostels
    if (user.role === "HOSTEL_MANAGER") {
      const managerAssignments = await prisma.hostelManagerAssignment.findMany({
        where: { userId: user.id, isActive: true }
      });
      const assignedHostelIds = managerAssignments.map(a => a.hostelId);
      
      where.bill = {
        ...where.bill,
        hostelId: { in: assignedHostelIds }
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: {
          select: { username: true, studentProfile: { select: { fullName: true } } }
        },
        bill: {
          select: { month: true, year: true, totalAmount: true, hostel: { select: { name: true } } }
        }
      },
      orderBy: { submittedAt: "desc" }
    });

    return successResponse(payments);
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return errorResponse("Failed to fetch payments", 500, "INTERNAL");
  }
}

