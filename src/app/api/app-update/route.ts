import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Mirror Mess — OTA web-bundle updates (Capgo updater plugin, self-hosted).
//
// The Android app POSTs here on launch with its current bundle version in
// `version_name`. If a newer bundle is published below, answer with
// { version, url, checksum } and the app downloads it silently in the
// background and applies it on the next launch. If the app is already
// current, answer with the up_to_date shape instead.
//
// The checksum is REQUIRED by the plugin (downloads without one are
// rejected with "Checksum required") and must be the sha256 hex of the zip
// served at the URL below.
//
// NOTE: this route intentionally returns the BARE JSON object — not the
// usual { success, data } envelope — because the Capgo plugin parses this
// response itself.
//
// TO PUBLISH A NEW UI UPDATE:
//   1. Replace bundle-data.ts with the new bundle's base64 (it is generated
//      together with the app build — see OTA_README.md).
//   2. Bump `version` and `checksum` in LATEST below to the new values.
//   3. Deploy. The URL never changes: /api/app-update/bundle always serves
//      whatever bundle-data.ts currently holds.
// Native changes (new plugins, permissions, package) still ship as APKs —
// OTA updates only the web layer (screens, styling, JS logic).
//
// NATIVE VERSION POLICY (v1.13.3): with every release, also set —
//   minNativeVersion:    oldest native (APK) version allowed to run. A
//                        device below it is blocked in-app until it
//                        installs a newer APK.
//   latestNativeVersion: newest native (APK) version published. A device
//                        below it (but >= min) sees a dismissible
//                        "update available" banner; at/above it, nothing.
// The app reads these via GET on this same route (see below). Bump
// latestNativeVersion whenever a new APK ships; raise minNativeVersion
// only when an old native must be retired.
// ─────────────────────────────────────────────────────────────────────────────
const LATEST = {
  version: "2.0.6",
  url: "https://mirrormess.vercel.app/api/app-update/bundle",
  checksum: "84ba360cef54c1026d5754f39e22e53cff2e7b0b942f603fd7043f4dd122d856",
  minNativeVersion: "2.0",
  latestNativeVersion: "2.0",
};

export async function POST(req: NextRequest) {
  try {
    let current: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.version_name === "string") {
        current = body.version_name;
      }
    } catch {
      current = null; // unreadable body → fall through and offer the latest
    }
    if (current && current === LATEST.version) {
      return NextResponse.json({
        message: "No new version available",
        kind: "up_to_date",
        error: "no_new_version_available",
      });
    }
    return NextResponse.json({
      version: LATEST.version,
      url: LATEST.url,
      checksum: LATEST.checksum,
    });
  } catch {
    // Never fail the check — worst case, offer the latest bundle. The
    // plugin no-ops on its own when the versions actually match.
    return NextResponse.json({
      version: LATEST.version,
      url: LATEST.url,
      checksum: LATEST.checksum,
    });
  }
}

// Native version policy for the app (v1.13.3): on boot the app GETs this
// route and compares its real native (APK) version — read from the Capgo
// updater plugin — against the policy below. Below minNativeVersion it is
// blocked; below latestNativeVersion it shows a dismissible banner.
// No auth: the values are public release metadata. Handy for a browser
// sanity check too — open https://mirrormess.vercel.app/api/app-update
// and you should see the JSON below.
import { getApkConfig } from "@/lib/apk-config";

export async function GET() {
  const apkConfig = getApkConfig();
  return NextResponse.json({
    minNativeVersion: apkConfig.minNativeVersion || LATEST.minNativeVersion,
    latestNativeVersion: apkConfig.latestNativeVersion || LATEST.latestNativeVersion,
    latestBundleVersion: apkConfig.latestBundleVersion || LATEST.version,
  });
}
