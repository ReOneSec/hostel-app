import { generateBulkBills } from "@/lib/billing";
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

    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const generatedCount = await generateBulkBills(month, year, "SYSTEM_CRON");

    return successResponse({ 
      message: `Cron executed. Generated ${generatedCount} bills for ${month}/${year}`,
      count: generatedCount,
    });
  } catch (error: any) {
    console.error("CRON Error generating bills:", error);
    return errorResponse("Failed to generate bills via cron", 500, "INTERNAL");
  }
}

