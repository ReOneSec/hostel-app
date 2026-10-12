import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
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
    const { hostelId, userId, month, year, status, amount, paidAmount, feeType } = body;

    if (!hostelId || !userId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isBedFee = feeType === "BED_FEE";
    const isEstFee = feeType === "ESTABLISHMENT_FEE";

    let monthNum = 0;
    let yearNum = 0;

    if (isBedFee) {
      monthNum = 0;
      yearNum = parseInt(String(year), 10) || new Date().getFullYear();
    } else if (isEstFee) {
      monthNum = 0;
      yearNum = 0;
    } else {
      monthNum = parseInt(String(month), 10);
      yearNum = parseInt(String(year), 10);

      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return NextResponse.json({ error: "Invalid month (must be 1-12)" }, { status: 400 });
      }

      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }
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
        message: "Payment record cleared",
        bill: null,
      });
    }

    const parsedAmount = amount !== undefined && amount !== "" && !isNaN(Number(amount)) ? parseFloat(amount) : null;
    const parsedPaid = paidAmount !== undefined && paidAmount !== "" && !isNaN(Number(paidAmount)) ? parseFloat(paidAmount) : null;

    if (existingBill) {
      let totalAmount = 0;
      let updateData: any = { status };

      if (isBedFee) {
        const finalBedFee = parsedAmount !== null ? parsedAmount : Number(existingBill.bedFee || existingBill.totalAmount);
        totalAmount = finalBedFee;
        updateData.bedFee = finalBedFee;
        updateData.billType = "BED_FEE";
      } else if (isEstFee) {
        const finalEstFee = parsedAmount !== null ? parsedAmount : Number(existingBill.establishmentFee || existingBill.totalAmount);
        totalAmount = finalEstFee;
        updateData.establishmentFee = finalEstFee;
        updateData.billType = "ESTABLISHMENT_FEE";
      } else {
        const finalRent = parsedAmount !== null ? parsedAmount : Number(existingBill.rentAmount);
        totalAmount = finalRent + Number(existingBill.messCharge || 0) + Number(existingBill.lateFee || 0);
        updateData.rentAmount = finalRent;
        updateData.establishmentFee = 0;
        updateData.bedFee = 0;
        updateData.billType = "RENT";
      }

      const finalPaid =
        status === "PAID"
          ? totalAmount
          : status === "PARTIALLY_PAID"
          ? parsedPaid !== null
            ? parsedPaid
            : Number(existingBill.paidAmount)
          : 0;

      updateData.totalAmount = totalAmount;
      updateData.paidAmount = finalPaid;

      const updatedBill = await prisma.bill.update({
        where: { id: existingBill.id },
        data: updateData,
      });

      await createAuditLog({
        userId: user.id,
        action: "BILL_STATUS_UPDATED",
        entity: "Bill",
        entityId: existingBill.id,
        oldValues: {
          status: existingBill.status,
          totalAmount: Number(existingBill.totalAmount),
          paidAmount: Number(existingBill.paidAmount),
        },
        newValues: {
          status: updatedBill.status,
          totalAmount: Number(updatedBill.totalAmount),
          paidAmount: Number(updatedBill.paidAmount),
        },
        ipAddress: getIpAddress(req.headers),
        userAgent: getUserAgent(req.headers),
      });

      try {
        revalidateTag("dashboard-stats", "max");
        revalidateTag("report-payments", "max");
      } catch {}

      return NextResponse.json({
        success: true,
        message: "Status updated successfully",
        bill: updatedBill,
      });
    } else {
      // Create new bill record
      let feeAmount = parsedAmount;

      if (feeAmount === null || isNaN(feeAmount)) {
        if (isBedFee) {
          const hostel = await prisma.hostel.findUnique({
            where: { id: hostelId },
            include: { bedFees: { where: { effectiveTo: null } } },
          });
          const hostelFee = hostel?.bedFees?.[0];
          feeAmount = hostelFee ? Number(hostelFee.amount) : 0;
        } else if (isEstFee) {
          const hostel = await prisma.hostel.findUnique({
            where: { id: hostelId },
            include: { establishmentFees: { where: { effectiveTo: null } } },
          });
          const estConfig = hostel?.establishmentFees?.[0];
          feeAmount = estConfig ? Number(estConfig.amount) : 0;
        } else {
          const rentConfig = await prisma.rentConfig.findFirst({
            where: { userId, hostelId, effectiveTo: null },
          });
          feeAmount = rentConfig ? Number(rentConfig.amount) : 0;
        }
      }

      const totalAmount = feeAmount;
      const finalPaid =
        status === "PAID"
          ? totalAmount
          : status === "PARTIALLY_PAID"
          ? parsedPaid !== null
            ? parsedPaid
            : 0
          : 0;

      const dueDate = isEstFee || isBedFee 
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        : new Date(yearNum, monthNum - 1, 7);

      const newBill = await prisma.bill.create({
        data: {
          userId,
          hostelId,
          month: monthNum,
          year: yearNum,
          billType: isBedFee ? "BED_FEE" : isEstFee ? "ESTABLISHMENT_FEE" : "RENT",
          rentAmount: !isBedFee && !isEstFee ? totalAmount : 0,
          establishmentFee: isEstFee ? totalAmount : 0,
          bedFee: isBedFee ? totalAmount : 0,
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
          totalAmount: Number(newBill.totalAmount),
          billType: newBill.billType,
        },
        ipAddress: getIpAddress(req.headers),
        userAgent: getUserAgent(req.headers),
      });

      try {
        revalidateTag("dashboard-stats", "max");
        revalidateTag("report-payments", "max");
      } catch {}

      return NextResponse.json({
        success: true,
        message: "Bill created and status saved",
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
