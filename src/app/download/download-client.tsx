"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Download,
  ExternalLink,
  QrCode,
  Check,
  Copy,
  Building2,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

import type { ApkConfig } from "@/lib/apk-config";

const PACKAGE_NAME = "com.mirrormess.app";
const DIRECT_APK_URL = "/api/app-download";

export default function DownloadPageClient({ initialConfig }: { initialConfig?: ApkConfig }) {
  const version = initialConfig?.version || "2.0";
  const otaBundleVersion = initialConfig?.latestBundleVersion || "1.13.5";
  const checksum = initialConfig?.checksum || "00511b33d530deea1f893564e48ec11a0eac6fad4a7c4f9181a072b8087795fd";
  const indusUrl = initialConfig?.indusStoreUrl || "https://www.indusappstore.com/apps/com.mirrormess.app";
  const firebaseUrl = initialConfig?.firebaseTesterUrl || "https://appdistribution.firebase.dev/i/cd048b80c443016e";

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/download`;
      QRCode.toDataURL(url, {
        width: 140,
        margin: 1,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      })
        .then(setQrDataUrl)
        .catch((err) => console.error("Error generating QR code:", err));
    }
  }, []);

  const handleCopyChecksum = () => {
    navigator.clipboard.writeText(checksum);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm sm:text-base">Mirror Hostels</span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 hidden sm:inline">Mobile App Downloads</span>
            </div>
          </Link>

          <Link
            href="/login"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Sign In to Web
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* App Title Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Mirror Mess for Android
                  </h1>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    v{version}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  Official mobile app for Mirror Hostels residents, mess management, and staff.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                  <span>Package: <code className="text-slate-700 font-mono text-[11px]">{PACKAGE_NAME}</code></span>
                  <span>•</span>
                  <span>Requires Android 8.0+</span>
                  <span>•</span>
                  <span>OTA Bundle {otaBundleVersion}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 sm:self-center">
              <a
                href={DIRECT_APK_URL}
                download="MirrorMess-v2.0.apk"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                Download APK
              </a>
            </div>
          </div>
        </div>

        {/* 3 Channels Section */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 px-1">
            Download Channels
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Channel 1: Direct Download */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Direct Server
                  </span>
                  <span className="text-xs text-slate-400">Recommended</span>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 text-base">Direct APK Download</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Download the latest release APK directly from our official server. No store login required.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>File:</span>
                    <span className="font-mono text-slate-800 text-[11px]">MirrorMess-v2.0.apk</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updates:</span>
                    <span className="text-slate-800">OTA In-App</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href={DIRECT_APK_URL}
                  download="MirrorMess-v2.0.apk"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download APK Directly
                </a>
              </div>
            </div>

            {/* Channel 2: Indus Appstore */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    Indus Appstore
                  </span>
                  <span className="text-xs text-slate-400">By PhonePe</span>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 text-base">PhonePe Indus Store</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Install through India&apos;s native app store. Includes verified security scans and automatic background updates.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Store:</span>
                    <span className="text-slate-800">Indus Appstore</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updates:</span>
                    <span className="text-slate-800">Automatic</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href={indusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  Open in Indus Store
                </a>
              </div>
            </div>

            {/* Channel 3: Firebase App Distribution */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    Firebase Tester
                  </span>
                  <span className="text-xs text-slate-400">Early Access</span>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 text-base">Firebase Distribution</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Join our official Google Firebase tester group to test pre-release builds and preview features.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Host:</span>
                    <span className="text-slate-800">Google Firebase</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Channel:</span>
                    <span className="text-slate-800">Tester Teaser</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href={firebaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  Open Firebase Tester
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Section: QR Code & Android Install Guide */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* QR Code */}
          <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center justify-center space-y-3">
            <div className="p-2 border border-slate-200 rounded-lg bg-white">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR Code to open download page"
                  className="w-32 h-32 object-contain"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  Generating...
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-800">Scan from Your Phone</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Scan with your Android camera or Google Lens to open this download page on mobile.
              </p>
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <h3 className="font-semibold text-slate-900 text-sm">
                How to Install Direct APK on Android
              </h3>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center shrink-0 text-[11px] border border-slate-200">
                  1
                </span>
                <span>
                  <strong>Download APK:</strong> Click <em>&quot;Download APK Directly&quot;</em>. If your browser displays a notice saying <em>&quot;File might be harmful&quot;</em>, tap <strong>Download anyway</strong> (standard Android notice for direct files).
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center shrink-0 text-[11px] border border-slate-200">
                  2
                </span>
                <span>
                  <strong>Allow Installation:</strong> Tap the downloaded file from your notification bar. If your device prompts <em>&quot;Install unknown apps&quot;</em>, tap <strong>Settings</strong> and enable <strong>Allow from this source</strong>.
                </span>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center shrink-0 text-[11px] border border-slate-200">
                  3
                </span>
                <span>
                  <strong>Open &amp; Sign In:</strong> Tap <strong>Install</strong>, open Mirror Mess, and log in with your resident account credentials.
                </span>
              </li>
            </ol>
          </div>
        </div>

        {/* Verification Checksum & Technical Specs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <span className="text-xs font-semibold text-slate-800">
              SHA-256 Release Checksum
            </span>
            <button
              type="button"
              onClick={handleCopyChecksum}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 cursor-pointer self-start sm:self-auto"
            >
              {copiedChecksum ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Copied to clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Checksum</span>
                </>
              )}
            </button>
          </div>

          <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
            {checksum}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Platform</span>
              <span className="font-medium text-slate-800">Android (Universal)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Minimum OS</span>
              <span className="font-medium text-slate-800">Android 8.0 (API 26)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Target OS</span>
              <span className="font-medium text-slate-800">Android 15 (API 35)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">OTA Engine</span>
              <span className="font-medium text-slate-800">Capgo Self-Hosted</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Mirror Hostels. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-800 transition-colors">
              Portal Login
            </Link>
            <Link href="/privacy" className="hover:text-slate-800 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-800 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
