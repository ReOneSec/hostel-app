import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Mirror Mess — OTA web-bundle updates (Capgo updater plugin, self-hosted).
//
// STANDALONE HOST (since 2026-10-21): this route lives in the tiny
// `ota-server/` Next.js project (repo subfolder, deployed as its OWN Vercel
// project with Root Directory = ota-server), NOT in the main hostel app.
// It was split out so publishing a UI update redeploys in seconds instead
// of waiting for a full build of the main server. The endpoints and
// responses are identical to the old main-app versions.
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
// NOTE on `url`: it intentionally stays on the main-app domain
// (mirrormess.vercel.app). In phase 3 the main app proxies
// /api/app-update and /api/app-update/bundle to this server (see
// MAIN_APP_REWRITE.md), so phones keep using the same URLs forever and
// this server stays an interchangeable backend. Do not change `url` to
// this project's own domain.
//
// TO PUBLISH A NEW UI UPDATE:
//   1. Replace bundle-data.ts (next to this file) with the new bundle's
//      base64 (generated together with the app build — see README.md).
//   2. Bump `version` and `checksum` in LATEST below to the new values.
//   3. Push. This project redeploys in seconds, and /api/app-update/bundle
//      always serves whatever bundle-data.ts currently holds.
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
  version: "2.0.1",
  url: "https://mirrormess.vercel.app/api/app-update/bundle",
  checksum: "ea2ab977e6bb0a7545080a58d16050821c2d35e5fc06333a4de392789ed817fc",
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
// sanity check too — open /api/app-update on this server's domain and
// you should see the JSON below.
export async function GET() {
  return NextResponse.json({
    minNativeVersion: LATEST.minNativeVersion,
    latestNativeVersion: LATEST.latestNativeVersion,
    latestBundleVersion: LATEST.version,
  });
}
