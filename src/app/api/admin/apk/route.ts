import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getApkConfig, saveApkConfig } from "@/lib/apk-config";
import { createAuditLog } from "@/lib/audit";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized", 403);
    }

    const config = getApkConfig();
    return successResponse(config);
  } catch (error) {
    console.error("[Admin APK GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized", 403);
    }

    const contentType = req.headers.get("content-type") || "";
    const previousConfig = getApkConfig();

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return errorResponse("No file provided", 400);
      }

      if (!file.name.toLowerCase().endsWith(".apk")) {
        return errorResponse("Uploaded file must have a .apk extension", 400);
      }

      const version = (formData.get("version") as string) || previousConfig.version;
      const minNativeVersion = (formData.get("minNativeVersion") as string) || previousConfig.minNativeVersion;
      const latestNativeVersion = (formData.get("latestNativeVersion") as string) || previousConfig.latestNativeVersion;
      const releaseNotes = (formData.get("releaseNotes") as string) || previousConfig.releaseNotes;

      // Write APK file to public/downloads/mirror-mess.apk
      const downloadDir = path.join(process.cwd(), "public", "downloads");
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      const apkPath = path.join(downloadDir, "mirror-mess.apk");
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(apkPath, buffer);

      // Calculate SHA-256 checksum
      const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
      const fileSize = buffer.length;

      const updated = saveApkConfig({
        version,
        minNativeVersion,
        latestNativeVersion,
        releaseNotes,
        checksum,
        fileSize,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      });

      // Audit log
      createAuditLog({
        userId: session.user.id,
        action: "UPDATE",
        entity: "APK_FILE",
        entityId: version,
        oldValues: { version: previousConfig.version, checksum: previousConfig.checksum, size: previousConfig.fileSize },
        newValues: { version, checksum, size: fileSize, fileName: file.name },
      });

      return successResponse({
        message: `APK uploaded successfully (v${version})`,
        config: updated,
      });
    }

    // JSON update (metadata, version policy, notes, links)
    const body = await req.json();
    const {
      version,
      minNativeVersion,
      latestNativeVersion,
      latestBundleVersion,
      releaseNotes,
      downloadUrl,
      indusStoreUrl,
      firebaseTesterUrl,
    } = body;

    const updated = saveApkConfig({
      ...(version && { version }),
      ...(minNativeVersion && { minNativeVersion }),
      ...(latestNativeVersion && { latestNativeVersion }),
      ...(latestBundleVersion && { latestBundleVersion }),
      ...(releaseNotes !== undefined && { releaseNotes }),
      ...(downloadUrl && { downloadUrl }),
      ...(indusStoreUrl && { indusStoreUrl }),
      ...(firebaseTesterUrl && { firebaseTesterUrl }),
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "APK_CONFIG",
      entityId: updated.version,
      oldValues: previousConfig as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
    });

    return successResponse({
      message: "APK configuration updated successfully",
      config: updated,
    });
  } catch (error) {
    console.error("[Admin APK POST]", error);
    return errorResponse("Failed to update APK", 500);
  }
}
