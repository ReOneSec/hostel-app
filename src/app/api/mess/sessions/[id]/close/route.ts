import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateMessSettlements } from "@/lib/mess-calculator";
import { sendEmail, messSettlementEmail } from "@/lib/email";
import { Decimal } from "decimal.js";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["HOSTEL_MANAGER", "SUPER_ADMIN", "MONTHLY_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;

    const messSession = await prisma.messSession.findUnique({
      where: { id: sessionId },
      include: {
        guestMeals: true,
      }
    });

    if (!messSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (messSession.status !== "DRAFT") {
      return NextResponse.json({ error: "Session is already closed" }, { status: 400 });
    }

    // 1. Get current Mess Config
    const config = await prisma.messConfig.findFirst({
      where: { hostelId: messSession.hostelId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' }
    });

    if (!config) {
      return NextResponse.json({ error: "No active mess config found for this hostel" }, { status: 400 });
    }

    // 2. Aggregate expenses
    const marketExpenses = await prisma.messMarketExpense.aggregate({
      where: { messSessionId: sessionId },
      _sum: { amount: true }
    });

    const waterExpenses = await prisma.messWaterExpense.aggregate({
      where: { messSessionId: sessionId },
      _sum: { amount: true }
    });

    const totalGuestMeals = messSession.guestMeals.reduce((acc, curr) => acc + curr.guestCount, 0);

    // 3. Get Student specific data
    const mealCounts = await prisma.messStudentMealCount.findMany({
      where: { messSessionId: sessionId }
    });

    const initialContributions = await prisma.messInitialContribution.findMany({
      where: { messSessionId: sessionId }
    });

    const individualMarketExpenses = await prisma.messMarketExpense.groupBy({
      by: ['userId'],
      where: { messSessionId: sessionId },
      _sum: { amount: true }
    });

    const individualWaterExpenses = await prisma.messWaterExpense.groupBy({
      by: ['userId'],
      where: { messSessionId: sessionId },
      _sum: { amount: true }
    });

    const activeAssignments = await prisma.hostelAssignment.findMany({
      where: { hostelId: messSession.hostelId, status: "ACTIVE" },
      select: { userId: true }
    });

    const studentUserIds = new Set([
      ...activeAssignments.map(a => a.userId),
      ...mealCounts.map(mc => mc.userId),
      ...individualMarketExpenses.map(e => e.userId),
      ...individualWaterExpenses.map(e => e.userId),
      ...initialContributions.map(c => c.userId)
    ]);

    if (studentUserIds.size === 0) {
      return NextResponse.json({ error: "Cannot close session: No students found." }, { status: 400 });
    }

    const students = Array.from(studentUserIds).map(userId => {
      const mc = mealCounts.find(m => m.userId === userId);
      const initial = initialContributions.filter(ic => ic.userId === userId).reduce((acc, curr) => acc.plus(new Decimal(curr.amount.toString())), new Decimal(0));
      const market = individualMarketExpenses.find(e => e.userId === userId)?._sum.amount || 0;
      const water = individualWaterExpenses.find(e => e.userId === userId)?._sum.amount || 0;
      
      return {
        userId: userId,
        mealCount: mc ? mc.mealCount : 0,
        initialContribution: initial,
        marketSpending: new Decimal(market.toString()),
        waterSpending: new Decimal(water.toString()),
      };
    });

    // 5. Run calculator
    const result = calculateMessSettlements({
      cookPayment: new Decimal(config.cookPayment.toString()),
      cleanerPayment: new Decimal(config.cleanerPayment.toString()),
      dustbinPayment: new Decimal(config.dustbinPayment.toString()),
      guestMealRate: new Decimal(config.guestMealRate.toString()),
      totalGuestMeals,
      marketExpenses: new Decimal(marketExpenses._sum.amount?.toString() || 0),
      waterExpenses: new Decimal(waterExpenses._sum.amount?.toString() || 0),
      students
    });

    // 6. Save in transaction
    await prisma.$transaction(async (tx) => {
      // Create settlements using createMany for bulk performance
      const settlementData = result.settlements.map(settlement => ({
        messSessionId: sessionId,
        userId: settlement.userId,
        mealCount: settlement.mealCount,
        mealCost: settlement.mealCost.toNumber(),
        universalCommonCharge: settlement.universalCommonCharge.toNumber(),
        initialContribution: settlement.initialContribution.toNumber(),
        marketSpending: settlement.marketSpending.toNumber(),
        waterSpending: settlement.waterSpending.toNumber(),
        totalContribution: settlement.totalContribution.toNumber(),
        totalLiability: settlement.totalLiability.toNumber(),
        netSettlement: settlement.netSettlement.toNumber()
      }));

      if (settlementData.length > 0) {
        await tx.messSettlement.createMany({
          data: settlementData
        });
      }

      // Close session
      await tx.messSession.update({
        where: { id: sessionId },
        data: {
          status: "CLOSED",
          totalMessCharge1: result.totalMessCharge1.toNumber(),
          totalGuestRecovery: result.totalGuestRecovery.toNumber(),
          totalMessCharge2: result.totalMessCharge2.toNumber(),
          totalStudentMeals: result.totalStudentMeals,
          universalMealCharge: result.universalMealCharge.toNumber(),
          cookPayment: config.cookPayment,
          cleanerPayment: config.cleanerPayment,
          dustbinPayment: config.dustbinPayment,
          guestMealRate: config.guestMealRate,
          closedAt: new Date(),
          closedBy: user.id
        }
      });
      
      // Update each student's Bill with the mess charge from their settlement
      for (const settlement of result.settlements) {
        // netSettlement > 0 means student owes, < 0 means student gets refund
        const messChargeForBill = settlement.netSettlement.toNumber();

        const existingBill = await tx.bill.findFirst({
          where: {
            userId: settlement.userId,
            hostelId: messSession.hostelId,
            month: messSession.month,
            year: messSession.year,
          }
        });

        if (existingBill) {
          const newTotal = existingBill.rentAmount.toNumber()
            + existingBill.establishmentFee.toNumber()
            + existingBill.bedFee.toNumber()
            + messChargeForBill
            + existingBill.lateFee.toNumber();

          await tx.bill.update({
            where: { id: existingBill.id },
            data: {
              messCharge: messChargeForBill,
              totalAmount: Math.max(newTotal, 0),
            }
          });
        }
      }
    });

    // 7. Send email notifications asynchronously
    const monthName = new Date(messSession.year, messSession.month - 1).toLocaleString('default', { month: 'long' });
    
    // Fetch all users to get names and emails
    const userIds = result.settlements.map(s => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { studentProfile: true }
    });

    for (const settlement of result.settlements) {
      const studentUser = users.find(u => u.id === settlement.userId);
      if (studentUser) {
        const studentName = studentUser.studentProfile?.fullName || studentUser.username;
        sendEmail({
          to: studentUser.email,
          subject: `Mess Settlement for ${monthName} ${messSession.year} - Mirror Hostels`,
          html: messSettlementEmail(
            studentName,
            monthName,
            messSession.year,
            settlement.mealCount,
            settlement.totalLiability.toFixed(2),
            settlement.totalContribution.toFixed(2),
            settlement.netSettlement.toFixed(2)
          ),
          userId: studentUser.id,
          type: "MESS_SETTLEMENT"
        }).catch(err => console.error("Failed to send mess settlement email to", studentUser.email, err));
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error closing mess session:", error);
    return NextResponse.json({ error: "Failed to close session" }, { status: 500 });
  }
}
