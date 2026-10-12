import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-response";
import { generateInvoicePDF } from "@/lib/pdf-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id: billId } = await params;

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        hostel: true,
        user: {
          include: {
            studentProfile: true,
          },
        },
        payments: {
          where: { status: "APPROVED" },
          orderBy: { paymentDate: "desc" },
          take: 1,
        },
      },
    });

    if (!bill) {
      return errorResponse("Bill not found", 404, "NOT_FOUND");
    }

    // Role check: Students can only download their own invoice
    if (session.user.role === "STUDENT" && bill.userId !== session.user.id) {
      return errorResponse("Forbidden", 403, "FORBIDDEN");
    }

    // Hostel Manager check
    if (session.user.role === "HOSTEL_MANAGER") {
      const isAssigned = await prisma.hostelManagerAssignment.findFirst({
        where: {
          userId: session.user.id,
          hostelId: bill.hostelId,
          isActive: true,
        },
      });
      if (!isAssigned) {
        return errorResponse("Forbidden", 403, "FORBIDDEN");
      }
    }

    // Format bill object for generator
    const latestPayment = bill.payments[0];
    const billData = {
      ...bill,
      rentAmount: Number(bill.rentAmount),
      establishmentFee: Number(bill.establishmentFee),
      bedFee: Number(bill.bedFee),
      messCharge: Number(bill.messCharge),
      lateFee: Number(bill.lateFee),
      totalAmount: Number(bill.totalAmount),
      paidAmount: Number(bill.paidAmount),
      paidDate: latestPayment?.paymentDate || null,
      utrNumber: latestPayment?.utrNumber || null,
    };

    const doc = generateInvoicePDF(billData, bill.user?.studentProfile, false);
    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    const invoiceNo = bill.id.slice(-8).toUpperCase();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice_${invoiceNo}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("[Bill Invoice GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
