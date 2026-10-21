# Phase 3 — point the main app at this OTA server

> ## ⚠️ DO NOT APPLY YET
> Apply this only when ALL of the following are true:
> 1. This `ota-server` project is deployed on Vercel as its own project
>    (Root Directory = `ota-server`) and its domain is known.
> 2. That domain has been verified by hand:
>    - `GET https://<TINY-DOMAIN>/api/app-update` returns the policy JSON
>      with the current bundle version.
>    - `GET https://<TINY-DOMAIN>/api/app-update/bundle` downloads bytes
>      whose sha256 equals the checksum in that JSON's POST response.
> 3. You are ready to redeploy the MAIN app once (a normal full deploy)
>    to pick up the config change.
>
> Until then, the main app keeps serving /api/app-update itself, exactly
> as today, and nothing about the phones changes.

## What changes

In the **main hostel-app repo** (repo root — NOT this folder), edit
`next.config.ts`. The file already has an `async rewrites()` returning a
plain array (the `/api/v1/:path*` rewrite). A plain array is checked
*after* the filesystem, so it would never win against the main app's own
`src/app/api/app-update/*` route files. Replace it with the object form
and put the two OTA proxies in **`beforeFiles`** (checked before
filesystem routes), keeping the existing rewrite in `afterFiles`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ...existing options (allowedDevOrigins etc.) stay as they are... */
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/app-update",
          destination: "https://<TINY-DOMAIN>/api/app-update",
        },
        {
          source: "/api/app-update/bundle",
          destination: "https://<TINY-DOMAIN>/api/app-update/bundle",
        },
      ],
      afterFiles: [
        // the pre-existing rewrite, unchanged
        {
          source: "/api/v1/:path*",
          destination: "/api/:path*",
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
```

Replace `<TINY-DOMAIN>` with this OTA server's real Vercel domain
(e.g. `mirror-ota-server.vercel.app`, no trailing slash).

## After applying

1. Redeploy the main app (push any commit, or redeploy from Vercel).
2. Verify the swap from the outside (the app needs no changes — its
   URLs never change):
   - `POST https://mirrormess.vercel.app/api/app-update` with an old
     `version_name` offers the same bundle version + checksum as the
     tiny server does directly.
   - `GET https://mirrormess.vercel.app/api/app-update/bundle` — sha256
     of the downloaded bytes still equals that checksum.
   - `GET https://mirrormess.vercel.app/api/app-update` returns the
     native-version policy.
3. Only after the above passes: the old files
   `src/app/api/app-update/route.ts`,
   `src/app/api/app-update/bundle/route.ts` and
   `src/app/api/app-update/bundle-data.ts` in the main app are dead code
   (shadowed by `beforeFiles`). They may be deleted in a later cleanup —
   deleting them is optional and is NOT part of this step. If they are
   ever deleted, `beforeFiles` still routes the paths to the tiny
   server, so behaviour does not change.

## Rollback

Remove the two `beforeFiles` entries (or revert the commit) and redeploy
the main app. As long as the main app's own `src/app/api/app-update/*`
files still exist, it goes back to serving updates itself with the same
bundle.
