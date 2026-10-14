import { prisma } from "@/lib/prisma";

export const LATE_FEE_PER_DAY = 10;

interface LateFeeCandidate {
  billId: string;
  userId: string;
  daysLate: number;
  feeToAdd: number;
  targetLateFee: number;
  newTotal: number;
}

/**
 * Calculates and applies late fees to all overdue bills.
 * Refactored into three ordered stages:
 * 1. Calculate each overdue bill's new target and collect only bills where targetLateFee > currentLateFee.
 * 2. Commit the LateFeeRecord and bill total updates in the transaction.
 * 3. After commit, notify each affected student with the amount added and new total.
 * 
 * Can be run safely multiple times a day (idempotent).
 * 
 * @returns Number of bills that received new late fees
 */
export async function calculateLateFees(): Promise<number> {
  const today = new Date();

  // Find all unpaid bills that are past their due date
  const overdueBills = await prisma.bill.findMany({
    where: {
      status: { in: ["GENERATED", "PARTIALLY_PAID", "OVERDUE"] },
      dueDate: { lt: today },
    },
    include: {
      lateFeeRecords: true,
    },
  });

  // Stage 1: Calculate target and collect candidates where targetLateFee > currentLateFee
  const candidates: LateFeeCandidate[] = [];

  for (const bill of overdueBills) {
    const diffTime = today.getTime() - bill.dueDate.getTime();
    const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysLate <= 0) continue;

    const targetLateFee = daysLate * LATE_FEE_PER_DAY;
    const currentLateFee =
      typeof bill.lateFee === "number"
        ? bill.lateFee
        : typeof bill.lateFee?.toNumber === "function"
        ? bill.lateFee.toNumber()
        : Number(bill.lateFee || 0);

    if (targetLateFee > currentLateFee) {
      const feeToAdd = targetLateFee - currentLateFee;
      const currentTotal =
        typeof bill.totalAmount === "number"
          ? bill.totalAmount
          : typeof bill.totalAmount?.toNumber === "function"
          ? bill.totalAmount.toNumber()
          : Number(bill.totalAmount || 0);
      const newTotal = currentTotal + feeToAdd;

      candidates.push({
        billId: bill.id,
        userId: bill.userId,
        daysLate,
        feeToAdd,
        targetLateFee,
        newTotal,
      });
    }
  }

  if (candidates.length === 0) {
    return 0;
  }

  // Stage 2: Commit transaction with LateFeeRecord and bill total updates
  const transactionOperations = candidates.flatMap((candidate) => [
    prisma.lateFeeRecord.create({
      data: {
        billId: candidate.billId,
        userId: candidate.userId,
        daysLate: candidate.daysLate,
        amount: candidate.feeToAdd,
      },
    }),
    prisma.bill.update({
      where: { id: candidate.billId },
      data: {
        lateFee: candidate.targetLateFee,
        totalAmount: { increment: candidate.feeToAdd },
        status: "OVERDUE",
      },
    }),
  ]);

  await prisma.$transaction(transactionOperations);

  // Stage 3: After commit, notify each affected student with amount added and new total
  for (const candidate of candidates) {
    // In-app system notice
    try {
      const { createSystemNotice } = await import("@/lib/services/announcements");
      await createSystemNotice({
        targetUserId: candidate.userId,
        title: "Bill overdue",
        body: `Your hostel bill is overdue by ${candidate.daysLate} ${
          candidate.daysLate === 1 ? "day" : "days"
        }. Late fees of Rs. ${candidate.feeToAdd.toFixed(0)} have been applied. Please pay immediately.`,
        eventKey: `bill-overdue-${candidate.billId}`,
        dedupKey: `system:bill-overdue:${candidate.billId}:${candidate.targetLateFee}`,
      });
    } catch (err) {
      console.error("[System Notice] Failed to create overdue announcement:", err);
    }

    // Push notification (HTTP v1)
    try {
      const { notifyLateFeeAdded } = await import("@/lib/notify");
      await notifyLateFeeAdded({
        billId: candidate.billId,
        userId: candidate.userId,
        amountAdded: candidate.feeToAdd,
        newTotal: candidate.newTotal,
      });
    } catch (pushErr) {
      console.error("[LateFee] Failed to send late fee push notification:", pushErr);
    }
  }

  // Audit log
  try {
    const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    const auditUserId = admin ? admin.id : "";

    if (auditUserId !== "") {
      await prisma.auditLog.create({
        data: {
          userId: auditUserId,
          action: "CALCULATE_LATE_FEES",
          entity: "Bill",
          newValues: { updatedCount: candidates.length, timestamp: today.toISOString() },
        },
      });
    }
  } catch (auditErr) {
    console.error("[LateFee Audit Error]", auditErr);
  }

  return candidates.length;
}
