# Mirror Mess OTA server (standalone)

A tiny, standalone Next.js app that serves **only** the over-the-air
web-bundle updates for the Mirror Mess Android app (Capgo updater plugin,
self-hosted):

| Endpoint | Purpose |
| --- | --- |
| `POST /api/app-update` | Capgo update check — the app sends its current bundle version, gets `{ version, url, checksum }` back when a newer bundle exists. |
| `GET /api/app-update` | Native (APK) version policy: `{ minNativeVersion, latestNativeVersion, latestBundleVersion }`. |
| `GET /api/app-update/bundle` | Downloads the current bundle zip (sha256 must equal the checksum above). |
| `GET /` | Trivial status page showing the live bundle version. |

## Why standalone?

These endpoints used to live inside the main hostel-app Next.js project,
so every UI-only update waited ~10–30 minutes for a **full server rebuild**
on Vercel. This project has no database, no auth and almost no code, so
its builds finish in seconds — an OTA publish is live almost immediately
after pushing.

The app does not talk to this project directly (yet). The bundle `url`
returned by the update check still points at the main-app domain
(`https://mirrormess.vercel.app/api/app-update/bundle`); in phase 3 the
main app will proxy those two paths to this server — see
`MAIN_APP_REWRITE.md`. **Do not apply that rewrite until this project is
deployed and its domain is verified.**

## Vercel setup (one time)

1. Vercel → **Add New… → Project** → import the `ReOneSec/hostel-app`
   repository (the same repo as the main app — this is a second project
   on it).
2. In the project settings set **Root Directory = `ota-server`**.
3. Framework Preset: **Next.js** (auto-detected). Build/Output settings:
   defaults.
4. **No environment variables** are needed.
5. Deploy. Note the project's domain (e.g. `mirror-ota-server.vercel.app`)
   — phase 3 needs it.

## Publishing a new bundle

Same flow as before, minus the wait:

1. Regenerate `app/api/app-update/bundle-data.ts` from the new bundle zip
   (base64 of the zip; the generator lives with the app build tooling).
2. In `app/api/app-update/route.ts`, bump `LATEST.version` and
   `LATEST.checksum` (sha256 hex of the new zip). If a new APK shipped,
   also bump `latestNativeVersion` (and `minNativeVersion` only when an
   old native must be retired).
3. Push to `master`. **This** project redeploys in seconds; the main app
   project is untouched.

The bundle currently published here is **1.13.4** — byte-identical to the
one the main app serves, so the two hosts can be swapped at any time.

## Local check

```bash
npm install
npm run build
npm start
curl http://localhost:3000/api/app-update
```
