import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { getApkConfig } from "@/lib/apk-config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const apkConfig = getApkConfig();

  // If an external storage or CDN download URL is configured, redirect to it
  const externalUrl = process.env.APP_DOWNLOAD_URL || process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL || (apkConfig.downloadUrl?.startsWith("http") ? apkConfig.downloadUrl : null);
  if (externalUrl) {
    return NextResponse.redirect(externalUrl, { status: 302 });
  }

  // Otherwise, serve local APK from public/downloads/mirror-mess.apk
  const apkPath = path.join(process.cwd(), "public", "downloads", "mirror-mess.apk");

  if (!fs.existsSync(apkPath)) {
    return NextResponse.json(
      { error: "APK file not found on server", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const stat = fs.statSync(apkPath);
  const fileStream = fs.createReadStream(apkPath);

  // Wrap node stream into web ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      fileStream.on("data", (chunk) => controller.enqueue(chunk));
      fileStream.on("end", () => controller.close());
      fileStream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": `attachment; filename="MirrorMess-v${apkConfig.version || "2.0"}.apk"`,
      "Content-Length": stat.size.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
