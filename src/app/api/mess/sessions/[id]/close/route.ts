import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateMessSettlements } from "@/lib/mess-calculator";
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

    if (mealCounts.length === 0) {
      return NextResponse.json({ error: "Cannot close session: No student meal counts entered." }, { status: 400 });
    }

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

    // 4. Map into calculator input format
    const students = mealCounts.map(mc => {
      const initial = initialContributions.filter(ic => ic.userId === mc.userId).reduce((acc, curr) => acc.plus(new Decimal(curr.amount.toString())), new Decimal(0));
      const market = individualMarketExpenses.find(e => e.userId === mc.userId)?._sum.amount || 0;
      const water = individualWaterExpenses.find(e => e.userId === mc.userId)?._sum.amount || 0;
      
      return {
        userId: mc.userId,
        mealCount: mc.mealCount,
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
      // Create settlements
      for (const settlement of result.settlements) {
        await tx.messSettlement.create({
          data: {
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
          }
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
      
      // Bonus Step: Add the `netSettlement` to the Monthly Bill? 
      // The Phase 7 bill generation logic probably uses the closed MessSession to populate bills later.
      // Or we can create bills right now if needed. The plan states "Bills reference messCharge which is only set when the mess session closes".
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error closing mess session:", error);
    return NextResponse.json({ error: "Failed to close session" }, { status: 500 });
  }
}
