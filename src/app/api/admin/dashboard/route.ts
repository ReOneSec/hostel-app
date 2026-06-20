import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getDashboardStats } from "@/lib/services/dashboard";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized", 403);
    }

    const data = await getDashboardStats();

    return successResponse(data);
  } catch (error) {
    console.error("[Dashboard Stats Error]", error);
    return errorResponse("Internal server error", 500);
  }
}
