# Mirror Mess — OTA (over-the-air) web-bundle updates

From app v1.13.0, Mirror Mess can update its own UI over the air. The app
(Capgo updater plugin, self-hosted mode) checks this server on every launch,
silently downloads a newer web bundle in the background, and applies it on
the next launch. No APK download, no reinstall. If a downloaded bundle ever
fails to start, the plugin automatically rolls back to the previous one.

**OTA updates only the web layer** — screens, styling, JS logic (like the
register exports or the overdue rule). **Native changes still ship as
APKs**: a new plugin, a new permission, a package change, or a Capacitor
upgrade. Rule of thumb: if the change is only in `src/` (the web bundle),
OTA can carry it; if it touches `android/` or `capacitor.config.json`'s
plugin list, it needs an APK.

## Files in this package — where they go in the server repo

Copy these into the `hostel-app` repo, keeping the paths:

| This package | Repo destination |
|---|---|
| `src/app/api/app-update/route.ts` | `src/app/api/app-update/route.ts` |
| `src/app/api/app-update/bundle/route.ts` | `src/app/api/app-update/bundle/route.ts` |
| `src/app/api/app-update/bundle-data.ts` | `src/app/api/app-update/bundle-data.ts` |

(`app-bundles/mirror-bundle-1.13.0.zip` in this package is just an archival
copy of the 1.13.0 bundle — the server never serves it directly. The zip
travels as base64 inside `bundle-data.ts` because the repo is updated
through a text-only channel.)

Deploying the repo (Vercel auto-deploys from master) publishes the update.
Within one launch cycle, every phone on v1.13.0+ picks it up.

## How the pieces fit

- The app is configured (in `capacitor.config.json`) with
  `updateUrl: https://mirrormess.vercel.app/api/app-update`, autoUpdate on,
  and stats/channel URLs empty — so the app talks **only** to this server
  for updates. Nothing goes to Capgo's cloud.
- The app POSTs `{ version_name: "<current bundle>", ... }` to
  `/api/app-update`. The route answers either the up-to-date shape or
  `{ version, url, checksum }`.
- `url` points at `/api/app-update/bundle`, which decodes `bundle-data.ts`
  and serves the zip.
- `checksum` **must** be the sha256 (hex) of that exact zip. The plugin
  verifies every download against it and rejects mismatches — and in this
  plugin version a zip response without a checksum is refused outright.
- Bundle zips must have `index.html` at the zip **root** (not inside a
  folder). The `npm run ota:bundle` script in the app repo guarantees this.

## Publishing a future UI-only update

1. Muse builds the new web bundle and runs `npm run ota:bundle`
   (in the app repo). It prints the new version, size and **sha256**, and
   writes `dist-ota/mirror-bundle-<version>.zip`.
2. Regenerate `bundle-data.ts` from that zip (base64 of the zip bytes,
   exported as `BUNDLE_B64`) and replace the file in the repo.
3. In `src/app/api/app-update/route.ts`, bump the two constants in the
   `LATEST` block: `version` → the new version, `checksum` → the new
   sha256. The `url` never changes.
4. Push/deploy. Users update silently on their next app launch.
5. To confirm what a phone is running: app → Settings → **UI bundle**
   shows the active bundle version.

## Sanity checks after deploying

- Open `https://mirrormess.vercel.app/api/app-update` in a browser — you
  should see the JSON with the current `version`, `url` and `checksum`.
- Open `https://mirrormess.vercel.app/api/app-update/bundle` — it should
  download a zip (~500 KB). Its sha256 must equal the published checksum.

## Rollback

To roll everyone back, publish the previous bundle again the same way
(older zip's base64 + its version/checksum in `LATEST`) and deploy. Phones
also self-protect: a bundle that doesn't call `notifyAppReady()` after a
successful boot is discarded automatically on the next launch.
