import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  uploadFile,
  validateMimeType,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/storage";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized. Students only." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const billId = formData.get("billId") as string;
    const amount = formData.get("amount") as string;
    const transactionId = formData.get("transactionId") as string;
    const utrNumber = formData.get("utrNumber") as string;
    const paymentDate = formData.get("paymentDate") as string;
    const categoriesString = formData.get("categories") as string;
    let categories = ["ALL"];
    if (categoriesString) {
      try {
        categories = JSON.parse(categoriesString);
      } catch (e) {}
    }

    if (!billId || !amount || !paymentDate || !file) {
      return NextResponse.json({ error: "Missing required fields including proof image" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    // Verify the bill belongs to the student
    const bill = await prisma.bill.findUnique({
      where: { id: billId }
    });

    if (!bill || bill.userId !== user.id) {
      return NextResponse.json({ error: "Invalid bill" }, { status: 400 });
    }

    // Validate MIME type server-side
    if (!validateMimeType(file.type, ALLOWED_IMAGE_TYPES)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${session.user.id}/bill_${billId}_${Date.now()}.${ext}`;

    let proofFileUrl: string;
    try {
      const result = await uploadFile("payments", path, buffer, file.type);
      proofFileUrl = result.url;
    } catch (e) {
      // If Supabase is not configured, use a placeholder URL
      proofFileUrl = `/uploads/payments/${path}`;
      console.warn(
        "[Payments] Supabase storage not configured, using placeholder URL"
      );
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

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (error: any) {
    console.error("Error submitting payment:", error);
    return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["SUPER_ADMIN", "HOSTEL_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

    return NextResponse.json({ data: payments });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
