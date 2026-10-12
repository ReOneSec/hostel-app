import { calculateLateFees } from "@/lib/late-fee";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecretHeader = req.headers.get("x-cron-secret");
    const secret = process.env.CRON_SECRET;
    const isAuthorized = Boolean(
      secret && (cronSecretHeader === secret || authHeader === `Bearer ${secret}`)
    );

    if (!isAuthorized) {
      return errorResponse("Unauthorized cron execution", 401, "UNAUTHORIZED");
    }

    const updatedCount = await calculateLateFees();

    return successResponse({ 
      message: `Cron executed. Applied late fees to ${updatedCount} bills.`,
      count: updatedCount,
    });
  } catch (error: any) {
    console.error("CRON Error calculating late fees:", error);
    return errorResponse("Failed to calculate late fees via cron", 500, "INTERNAL");
  }
}

