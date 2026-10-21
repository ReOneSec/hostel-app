import type { Metadata } from "next";
import DownloadPageClient from "./download-client";

export const metadata: Metadata = {
  title: "Download Mirror Mess Android App | Mirror Hostels",
  description:
    "Download the official Mirror Mess Android app directly from our server, via Indus Appstore, or through Firebase App Distribution. Real-time mess billing, instant UPI payments, and push notices.",
  keywords: [
    "Mirror Mess",
    "Mirror Hostels",
    "Download Android App",
    "Hostel Mess App",
    "Indus Appstore",
    "Firebase App Distribution",
    "Mirror Mess APK",
  ],
  openGraph: {
    title: "Download Mirror Mess Android App | Mirror Hostels",
    description:
      "Get the official Mirror Mess Android app. Download the APK directly, install via Indus Appstore, or join via Firebase App Distribution.",
    type: "website",
  },
};

import { getApkConfig } from "@/lib/apk-config";

export const dynamic = "force-dynamic";

export default function DownloadPage() {
  const config = getApkConfig();
  return <DownloadPageClient initialConfig={config} />;
}
