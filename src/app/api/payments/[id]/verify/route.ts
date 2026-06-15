import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, paymentStatusEmail } from "@/lib/email";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["SUPER_ADMIN", "HOSTEL_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const paymentId = resolvedParams.id;
    const body = await req.json();
    const { status, rejectionReason } = body; // status: "APPROVED" | "REJECTED"

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { 
        bill: true,
        user: {
          include: { studentProfile: true }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "PENDING_REVIEW") {
      return NextResponse.json({ error: "Payment has already been processed" }, { status: 400 });
    }

    // Process the payment inside a transaction
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // 1. Update Payment status
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          rejectionReason: status === "REJECTED" ? rejectionReason : null,
          verifiedBy: user.id,
          verifiedAt: new Date()
        }
      });

      // 2. If APPROVED, update the Bill paidAmount and status
      if (status === "APPROVED") {
        const bill = payment.bill;
        const newPaidAmount = bill.paidAmount.toNumber() + payment.amount.toNumber();
        const totalAmount = bill.totalAmount.toNumber();

        let newBillStatus = bill.status;
        if (newPaidAmount >= totalAmount) {
          newBillStatus = "PAID";
        } else if (newPaidAmount > 0) {
          newBillStatus = "PARTIALLY_PAID";
        }

        await tx.bill.update({
          where: { id: bill.id },
          data: {
            paidAmount: newPaidAmount,
            status: newBillStatus
          }
        });
      }

      return updated;
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `PAYMENT_${status}`,
        entity: "Payment",
        entityId: paymentId,
        newValues: { status, rejectionReason }
      }
    });

    // Send email notification
    const studentName = payment.user.studentProfile?.fullName || payment.user.username;
    await sendEmail({
      to: payment.user.email,
      subject: `Payment ${status === "APPROVED" ? "Approved" : "Rejected"} - Mirror Hostels`,
      html: paymentStatusEmail(studentName, status as "APPROVED" | "REJECTED", payment.amount.toString(), rejectionReason),
      userId: payment.user.id,
      type: "PAYMENT_STATUS",
    });

    return NextResponse.json({ data: updatedPayment });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
