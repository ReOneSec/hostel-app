import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.56.1", "192.168.0.153", "localhost", "127.0.0.1", "*.trycloudflare.com"],
  async rewrites() {
    return {
      beforeFiles: [
        // Mirror Mess OTA: the app-update endpoints are served by the tiny
        // standalone OTA server (repo folder ota-server/, its own Vercel
        // project) so bundle publishes no longer wait for a full build of
        // this app. The public URLs are unchanged.
        {
          source: "/api/app-update",
          destination: "https://mirrormess-ota.vercel.app/api/app-update",
        },
        {
          source: "/api/app-update/bundle",
          destination: "https://mirrormess-ota.vercel.app/api/app-update/bundle",
        },
      ],
      afterFiles: [
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
