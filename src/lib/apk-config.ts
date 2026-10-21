import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ApkConfig {
  version: string;
  minNativeVersion: string;
  latestNativeVersion: string;
  latestBundleVersion: string;
  checksum: string;
  fileSize: number;
  uploadedAt: string;
  releaseNotes: string;
  downloadUrl: string;
  indusStoreUrl: string;
  firebaseTesterUrl: string;
  fileName: string;
}

const DEFAULT_CONFIG: ApkConfig = {
  version: "2.0",
  minNativeVersion: "2.0",
  latestNativeVersion: "2.0",
  latestBundleVersion: "1.13.5",
  checksum: "00511b33d530deea1f893564e48ec11a0eac6fad4a7c4f9181a072b8087795fd",
  fileSize: 0,
  uploadedAt: "2026-10-21T00:00:00.000Z",
  releaseNotes: "Mirror Mess v2.0 with per-bill dynamic UPI QR, 7th-rule overdue billing, and instant OTA bundle updates.",
  downloadUrl: "/downloads/mirror-mess.apk",
  indusStoreUrl: "https://www.indusappstore.com/apps/com.mirrormess.app",
  firebaseTesterUrl: "https://appdistribution.firebase.dev/i/cd048b80c443016e",
  fileName: "mirror-mess.apk",
};

function getConfigPath(): string {
  return path.join(process.cwd(), "public", "downloads", "apk-config.json");
}

function getApkFilePath(): string {
  return path.join(process.cwd(), "public", "downloads", "mirror-mess.apk");
}

export function computeSha256Sync(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) return DEFAULT_CONFIG.checksum;
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch {
    return DEFAULT_CONFIG.checksum;
  }
}

export function getApkConfig(): ApkConfig {
  const configPath = getConfigPath();
  const apkPath = getApkFilePath();

  let config: ApkConfig = { ...DEFAULT_CONFIG };

  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, "utf-8");
      config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (e) {
      console.error("[ApkConfig] Failed to read apk-config.json, falling back to default:", e);
    }
  }

  // Check real APK file on disk to sync actual size
  if (fs.existsSync(apkPath)) {
    try {
      const stats = fs.statSync(apkPath);
      config.fileSize = stats.size;
    } catch {
      // keep config.fileSize as is
    }
  }

  return config;
}

export function saveApkConfig(updates: Partial<ApkConfig>): ApkConfig {
  const current = getApkConfig();
  const updated: ApkConfig = {
    ...current,
    ...updates,
    uploadedAt: updates.uploadedAt || new Date().toISOString(),
  };

  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
