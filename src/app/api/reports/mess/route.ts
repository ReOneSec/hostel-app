import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized", 403);
    }

    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()));

    const whereClause: any = { month, year };
    if (hostelId) whereClause.hostelId = hostelId;

    const sessions = await prisma.messSession.findMany({
      where: whereClause,
      include: {
        hostel: { select: { name: true } },
        settlements: {
          include: {
            user: {
              select: {
                email: true,
                studentProfile: { select: { fullName: true } },
              },
            },
          },
        },
        marketExpenses: true,
        waterExpenses: true,
        guestMeals: true,
        studentMealCounts: true,
      },
    });

    const report = sessions.map((s) => {
      const totalMarket = s.marketExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalWater = s.waterExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalGuestMeals = s.guestMeals.reduce((sum, g) => sum + g.guestCount, 0);
      const totalStudentMeals = s.studentMealCounts.reduce((sum, m) => sum + m.mealCount, 0);

      const settlements = s.settlements.map((st) => ({
        userId: st.userId,
        name: st.user.studentProfile?.fullName || st.user.email,
        mealCount: st.mealCount,
        mealCost: Number(st.mealCost),
        commonCharge: Number(st.universalCommonCharge),
        totalContribution: Number(st.totalContribution),
        totalLiability: Number(st.totalLiability),
        netSettlement: Number(st.netSettlement),
      }));

      return {
        sessionId: s.id,
        hostelId: s.hostelId,
        hostelName: s.hostel.name,
        month: s.month,
        year: s.year,
        status: s.status,
        universalMealCharge: s.universalMealCharge ? Number(s.universalMealCharge) : null,
        totalMessCost: s.totalMessCharge1 ? Number(s.totalMessCharge1) : totalMarket + totalWater + Number(s.cookPayment || 0) + Number(s.cleanerPayment || 0) + Number(s.dustbinPayment || 0),
        guestRecovery: s.totalGuestRecovery ? Number(s.totalGuestRecovery) : totalGuestMeals * Number(s.guestMealRate || 65),
        totalMarketExpenses: totalMarket,
        totalWaterExpenses: totalWater,
        totalGuestMeals,
        totalStudentMeals,
        studentCount: s.studentMealCounts.length,
        closedAt: s.closedAt,
        settlements: s.status === "CLOSED" ? settlements : [],
      };
    });

    return successResponse({ month, year, sessions: report });
  } catch (error) {
    console.error("[Reports Mess]", error);
    return errorResponse("Internal server error", 500);
  }
}
