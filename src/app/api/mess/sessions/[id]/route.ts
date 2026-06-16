import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateMessSettlements } from "@/lib/mess-calculator";
import { Decimal } from "decimal.js";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["HOSTEL_MANAGER", "MONTHLY_MANAGER", "SUPER_ADMIN", "STUDENT"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;

    const messSession = await prisma.messSession.findUnique({
      where: { id: sessionId },
    });

    if (!messSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Security: Students can only view mess sessions for their assigned hostel
    if (user.role === "STUDENT") {
      const studentAssignment = await prisma.hostelAssignment.findFirst({
        where: { userId: user.id, hostelId: messSession.hostelId, status: "ACTIVE" }
      });
      if (!studentAssignment) {
        return NextResponse.json({ error: "You do not have access to this mess session" }, { status: 403 });
      }
    }

    // Fetch related data
    const [marketExpensesRaw, waterExpensesRaw, guestMeals, initialContributionsRaw, mealCountsRaw, settlementsRaw] = await Promise.all([
      prisma.messMarketExpense.findMany({ where: { messSessionId: sessionId }, include: { user: { select: { email: true, studentProfile: { select: { fullName: true } } } } } }),
      prisma.messWaterExpense.findMany({ where: { messSessionId: sessionId }, include: { user: { select: { email: true, studentProfile: { select: { fullName: true } } } } } }),
      prisma.messGuestMeal.findMany({ where: { messSessionId: sessionId } }),
      prisma.messInitialContribution.findMany({ where: { messSessionId: sessionId }, include: { user: { select: { email: true, studentProfile: { select: { fullName: true } } } } } }),
      prisma.messStudentMealCount.findMany({ where: { messSessionId: sessionId }, include: { user: { select: { email: true, studentProfile: { select: { fullName: true } } } } } }),
      prisma.messSettlement.findMany({ where: { messSessionId: sessionId }, include: { user: { select: { email: true, studentProfile: { select: { fullName: true } } } } } })
    ]);

    const mapUser = (item: any) => ({
      ...item,
      user: {
        email: item.user.email,
        fullName: item.user.studentProfile?.fullName || null
      }
    });

    let liveEstimate = null;
    if (messSession.status === "DRAFT") {
      const config = await prisma.messConfig.findFirst({
        where: { hostelId: messSession.hostelId, effectiveTo: null },
        orderBy: { effectiveFrom: 'desc' }
      });

      if (config) {
        const totalGuestMeals = guestMeals.reduce((acc, curr) => acc + curr.guestCount, 0);
        const marketSum = marketExpensesRaw.reduce((acc, curr) => acc.plus(new Decimal(curr.amount.toString())), new Decimal(0));
        const waterSum = waterExpensesRaw.reduce((acc, curr) => acc.plus(new Decimal(curr.amount.toString())), new Decimal(0));

        const individualMarket = marketExpensesRaw.reduce((acc: Record<string, Decimal>, curr) => {
          acc[curr.userId] = (acc[curr.userId] || new Decimal(0)).plus(new Decimal(curr.amount.toString()));
          return acc;
        }, {});

        const individualWater = waterExpensesRaw.reduce((acc: Record<string, Decimal>, curr) => {
          acc[curr.userId] = (acc[curr.userId] || new Decimal(0)).plus(new Decimal(curr.amount.toString()));
          return acc;
        }, {});

        const students = mealCountsRaw.map(mc => {
          const initial = initialContributionsRaw.filter(ic => ic.userId === mc.userId).reduce((acc, curr) => acc.plus(new Decimal(curr.amount.toString())), new Decimal(0));
          return {
            userId: mc.userId,
            mealCount: mc.mealCount,
            initialContribution: initial,
            marketSpending: individualMarket[mc.userId] || new Decimal(0),
            waterSpending: individualWater[mc.userId] || new Decimal(0),
          };
        });

        if (students.length > 0) {
          liveEstimate = calculateMessSettlements({
            cookPayment: new Decimal(config.cookPayment.toString()),
            cleanerPayment: new Decimal(config.cleanerPayment.toString()),
            dustbinPayment: new Decimal(config.dustbinPayment.toString()),
            guestMealRate: new Decimal(config.guestMealRate.toString()),
            totalGuestMeals,
            marketExpenses: marketSum,
            waterExpenses: waterSum,
            students
          });
        }
      }
    }

    return NextResponse.json({ 
      data: {
        session: messSession,
        marketExpenses: marketExpensesRaw.map(mapUser),
        waterExpenses: waterExpensesRaw.map(mapUser),
        guestMeals,
        initialContributions: initialContributionsRaw.map(mapUser),
        mealCounts: mealCountsRaw.map(mapUser),
        settlements: settlementsRaw.map(mapUser),
        liveEstimate
      } 
    });
  } catch (error: any) {
    console.error("Error fetching mess session details:", error);
    return NextResponse.json({ error: "Failed to fetch session details" }, { status: 500 });
  }
}
