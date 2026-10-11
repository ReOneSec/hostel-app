import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "HOSTEL_MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { hostelId, userId, month, year, status, amount, paidAmount } = body;

    if (!hostelId || !userId || month === undefined || year === undefined || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const monthNum = parseInt(String(month), 10);
    const yearNum = parseInt(String(year), 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: "Invalid month (must be 1-12)" }, { status: 400 });
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    const validStatuses = ["GENERATED", "PAID", "PARTIALLY_PAID", "OVERDUE", "NOT_BILLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // Check if a bill already exists for this student in this hostel/month/year
    const existingBill = await prisma.bill.findUnique({
      where: {
        userId_hostelId_month_year: {
          userId,
          hostelId,
          month: monthNum,
          year: yearNum,
        },
      },
    });

    if (status === "NOT_BILLED") {
      if (existingBill) {
        await prisma.$transaction([
          prisma.lateFeeRecord.deleteMany({ where: { billId: existingBill.id } }),
          prisma.payment.deleteMany({ where: { billId: existingBill.id } }),
          prisma.bill.delete({ where: { id: existingBill.id } }),
        ]);

        await createAuditLog({
          userId: user.id,
          action: "BILL_DELETED",
          entity: "Bill",
          entityId: existingBill.id,
          oldValues: { status: existingBill.status, month: monthNum, year: yearNum },
          newValues: undefined,
          ipAddress: getIpAddress(req.headers),
          userAgent: getUserAgent(req.headers),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Payment record cleared for this month",
        bill: null,
      });
    }

    const parsedAmount = amount !== undefined && amount !== "" && !isNaN(Number(amount)) ? parseFloat(amount) : null;
    const parsedPaid = paidAmount !== undefined && paidAmount !== "" && !isNaN(Number(paidAmount)) ? parseFloat(paidAmount) : null;

    if (existingBill) {
      const finalRent = parsedAmount !== null ? parsedAmount : Number(existingBill.rentAmount);
      const totalAmount = finalRent + Number(existingBill.bedFee) + Number(existingBill.establishmentFee);
      const finalPaid =
        status === "PAID"
          ? totalAmount
          : status === "PARTIALLY_PAID"
          ? parsedPaid !== null
            ? parsedPaid
            : Number(existingBill.paidAmount)
          : 0;

      const updatedBill = await prisma.bill.update({
        where: { id: existingBill.id },
        data: {
          status,
          rentAmount: finalRent,
          totalAmount,
          paidAmount: finalPaid,
        },
      });

      await createAuditLog({
        userId: user.id,
        action: "BILL_STATUS_UPDATED",
        entity: "Bill",
        entityId: existingBill.id,
        oldValues: {
          status: existingBill.status,
          rentAmount: Number(existingBill.rentAmount),
          paidAmount: Number(existingBill.paidAmount),
        },
        newValues: {
          status: updatedBill.status,
          rentAmount: Number(updatedBill.rentAmount),
          paidAmount: Number(updatedBill.paidAmount),
        },
        ipAddress: getIpAddress(req.headers),
        userAgent: getUserAgent(req.headers),
      });

      return NextResponse.json({
        success: true,
        message: "Payment status updated successfully",
        bill: updatedBill,
      });
    } else {
      // Create new bill record
      let rentAmount = parsedAmount;
      if (rentAmount === null || isNaN(rentAmount)) {
        const rentConfig = await prisma.rentConfig.findFirst({
          where: { userId, hostelId, effectiveTo: null },
        });
        rentAmount = rentConfig ? Number(rentConfig.amount) : 0;
      }

      const totalAmount = rentAmount;
      const finalPaid =
        status === "PAID"
          ? totalAmount
          : status === "PARTIALLY_PAID"
          ? parsedPaid !== null
            ? parsedPaid
            : 0
          : 0;

      const dueDate = new Date(yearNum, monthNum - 1, 7);

      const newBill = await prisma.bill.create({
        data: {
          userId,
          hostelId,
          month: monthNum,
          year: yearNum,
          rentAmount,
          establishmentFee: 0,
          bedFee: 0,
          messCharge: 0,
          lateFee: 0,
          totalAmount,
          paidAmount: finalPaid,
          status,
          dueDate,
          generatedBy: user.id,
        },
      });

      await createAuditLog({
        userId: user.id,
        action: "BILL_CREATED",
        entity: "Bill",
        entityId: newBill.id,
        oldValues: undefined,
        newValues: {
          status: newBill.status,
          rentAmount: Number(newBill.rentAmount),
          paidAmount: Number(newBill.paidAmount),
          month: monthNum,
          year: yearNum,
        },
        ipAddress: getIpAddress(req.headers),
        userAgent: getUserAgent(req.headers),
      });

      return NextResponse.json({
        success: true,
        message: "Payment status set successfully",
        bill: newBill,
      });
    }
  } catch (error: any) {
    console.error("Error setting month payment status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update payment status" },
      { status: 500 }
    );
  }
}
