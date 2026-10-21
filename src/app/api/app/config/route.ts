import { NextResponse } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getApkConfig } from "@/lib/apk-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const apkConfig = getApkConfig();
  const minAppVersion = process.env.APP_MIN_VERSION || apkConfig.minNativeVersion || "2.0";
  const latestAppVersion = process.env.APP_LATEST_VERSION || apkConfig.latestNativeVersion || "2.0";
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
