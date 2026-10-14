import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const minAppVersion = process.env.APP_MIN_VERSION || "1.6.0";
  const latestAppVersion = process.env.APP_LATEST_VERSION || "1.6.0";
  const maintenance = process.env.APP_MAINTENANCE === "true";
  const maintenanceMessage = process.env.APP_MAINTENANCE_MESSAGE || "";

  return successResponse({
    minAppVersion,
    latestAppVersion,
    maintenance,
    maintenanceMessage,
    features: {
      mess: false,
      uploads: true,
    },
  });
}
