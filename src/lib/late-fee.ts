import { prisma } from "@/lib/prisma";

const LATE_FEE_PER_DAY = 50;

/**
 * Calculates and applies late fees to all overdue bills.
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
      dueDate: { lt: today }
    },
    include: {
      lateFeeRecords: true
    }
  });

  let updatedCount = 0;
  const transactionOperations = [];

  for (const bill of overdueBills) {
    // Calculate days late (difference between today and due date)
    const diffTime = today.getTime() - bill.dueDate.getTime();
    const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysLate <= 0) continue;

    // Calculate the target late fee total
    const targetLateFee = daysLate * LATE_FEE_PER_DAY;

    // Calculate how much late fee has already been applied
    const currentLateFee = bill.lateFee.toNumber();

    if (targetLateFee > currentLateFee) {
      const feeToAdd = targetLateFee - currentLateFee;

      // Queue operations for atomic bulk execution
      transactionOperations.push(
        // 1. Create audit record
        prisma.lateFeeRecord.create({
          data: {
            billId: bill.id,
            userId: bill.userId,
            daysLate,
            amount: feeToAdd
          }
        })
      );
      
      transactionOperations.push(
        // 2. Update bill totals and status
        prisma.bill.update({
          where: { id: bill.id },
          data: {
            lateFee: targetLateFee,
            totalAmount: { increment: feeToAdd },
            status: "OVERDUE"
          }
        })
      );

      updatedCount++;
    }
  }

  if (transactionOperations.length > 0) {
    await prisma.$transaction(transactionOperations);
  }

  // Find a super admin for audit log
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }});
  const auditUserId = admin ? admin.id : "";

  if (updatedCount > 0 && auditUserId !== "") {
    await prisma.auditLog.create({
      data: {
        userId: auditUserId,
        action: "CALCULATE_LATE_FEES",
        entity: "Bill",
        newValues: { updatedCount, timestamp: today.toISOString() }
      }
    });
  }

  return updatedCount;
}
