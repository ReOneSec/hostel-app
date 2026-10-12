import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getAnnualFinancialReport } from "@/lib/services/reports";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user?.id ||
      (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")
    ) {
      return errorResponse("Unauthorized", 403);
    }

    const { searchParams } = new URL(req.url);
    const hostelIdParam = searchParams.get("hostelId");
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    let targetHostelId: string | null = hostelIdParam && hostelIdParam !== "all" ? hostelIdParam : null;

    // If Hostel Manager, verify hostel authorization
    if (session.user.role === "HOSTEL_MANAGER") {
      const managed = await prisma.hostelManagerAssignment.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { hostelId: true },
      });
      const allowedHostelIds = managed.map((m) => m.hostelId);

      if (targetHostelId) {
        if (!allowedHostelIds.includes(targetHostelId)) {
          return errorResponse("Access denied for this hostel", 403);
        }
      } else {
        // Manager must filter by their allowed hostels
        if (allowedHostelIds.length === 1) {
          targetHostelId = allowedHostelIds[0];
        }
      }
    }

    const data = await getAnnualFinancialReport(targetHostelId, year);
    return successResponse(data);
  } catch (error) {
    console.error("[Reports Payments Annual API]", error);
    return errorResponse("Internal server error", 500);
  }
}
