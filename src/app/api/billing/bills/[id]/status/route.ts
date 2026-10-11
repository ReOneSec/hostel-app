import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "HOSTEL_MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { status } = body;

    if (!status || !["GENERATED", "PAID", "PARTIALLY_PAID", "OVERDUE"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existingBill = await prisma.bill.findUnique({
      where: { id }
    });

    if (!existingBill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: { 
        status,
        paidAmount: status === "PAID" ? existingBill.totalAmount : (status === "GENERATED" ? 0 : existingBill.paidAmount)
      }
    });

    await createAuditLog({
      userId: user.id,
      action: "BILL_STATUS_UPDATED",
      entity: "Bill",
      entityId: bill.id,
      oldValues: { status: existingBill.status, paidAmount: existingBill.paidAmount },
      newValues: { status: bill.status, paidAmount: bill.paidAmount },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return NextResponse.json({ data: bill });
  } catch (error: any) {
    console.error("Error updating bill status:", error);
    return NextResponse.json(
      { error: "Failed to update bill status" },
      { status: 500 }
    );
  }
}
