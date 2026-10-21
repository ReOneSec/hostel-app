import { BUNDLE_B64 } from "../bundle-data";

// Serves the current OTA bundle zip. The zip is stored base64-encoded in
// ../bundle-data.ts (the repo is updated through a text-only channel, so
// the binary cannot be committed directly). The bytes served here MUST
// hash (sha256) to LATEST.checksum in ../route.ts — the app verifies the
// download against it and rejects mismatches.
export async function GET() {
  const buf = Buffer.from(BUNDLE_B64, "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(buf.length),
      "Content-Disposition": 'attachment; filename="mirror-bundle.zip"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
