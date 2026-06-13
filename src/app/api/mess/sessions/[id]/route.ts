import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

    return NextResponse.json({ 
      data: {
        session: messSession,
        marketExpenses: marketExpensesRaw.map(mapUser),
        waterExpenses: waterExpensesRaw.map(mapUser),
        guestMeals,
        initialContributions: initialContributionsRaw.map(mapUser),
        mealCounts: mealCountsRaw.map(mapUser),
        settlements: settlementsRaw.map(mapUser)
      } 
    });
  } catch (error: any) {
    console.error("Error fetching mess session details:", error);
    return NextResponse.json({ error: "Failed to fetch session details" }, { status: 500 });
  }
}
