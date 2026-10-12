import { auth } from "@/lib/auth";
import { getBillingRegister } from "@/lib/services/billing";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    if (!hostelId) {
      return errorResponse("hostelId is required", 400, "VALIDATION_ERROR");
    }

    const data = await getBillingRegister(hostelId, year);

    return successResponse(data);
  } catch (error: any) {
    console.error("Error fetching register data:", error);
    return errorResponse("Failed to fetch register data", 500, "INTERNAL");
  }
}

