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
// ─────────────────────────────────────────────────────────────────────────────
const LATEST = {
  version: "1.13.1",
  url: "https://mirrormess.vercel.app/api/app-update/bundle",
  checksum: "c596ecf9e45b3191dfe82c4413fc5342a86c23497c3d2f5bb96f2f9d510849ea",
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

// Handy for a browser sanity check after deploying: open
// https://mirrormess.vercel.app/api/app-update and you should see the
// JSON below.
export async function GET() {
  return NextResponse.json({
    version: LATEST.version,
    url: LATEST.url,
    checksum: LATEST.checksum,
  });
}
