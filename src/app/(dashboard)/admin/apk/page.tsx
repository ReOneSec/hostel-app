"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Smartphone,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  FileText,
  RefreshCw,
  Clock,
  ShieldCheck,
  Settings2,
  Loader2,
} from "lucide-react";

interface ApkConfigData {
  version: string;
  minNativeVersion: string;
  latestNativeVersion: string;
  latestBundleVersion: string;
  checksum: string;
  fileSize: number;
  uploadedAt: string;
  releaseNotes: string;
  downloadUrl: string;
  indusStoreUrl: string;
  firebaseTesterUrl: string;
  fileName?: string;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch APK config");
    return res.json();
  });

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminApkManagementPage() {
  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: ApkConfigData }>(
    "/api/admin/apk",
    fetcher
  );

  const config = data?.data;

  // Upload Form State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadVersion, setUploadVersion] = useState("");
  const [uploadMinVersion, setUploadMinVersion] = useState("");
  const [uploadLatestVersion, setUploadLatestVersion] = useState("");
  const [uploadReleaseNotes, setUploadReleaseNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Settings Form State
  const [settingsVersion, setSettingsVersion] = useState("");
  const [settingsMinVersion, setSettingsMinVersion] = useState("");
  const [settingsLatestVersion, setSettingsLatestVersion] = useState("");
  const [settingsBundleVersion, setSettingsBundleVersion] = useState("");
  const [settingsReleaseNotes, setSettingsReleaseNotes] = useState("");
  const [settingsIndusUrl, setSettingsIndusUrl] = useState("");
  const [settingsFirebaseUrl, setSettingsFirebaseUrl] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Clipboard States
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state when config loads
  useEffect(() => {
    if (config) {
      setUploadVersion(config.version || "2.0");
      setUploadMinVersion(config.minNativeVersion || "2.0");
      setUploadLatestVersion(config.latestNativeVersion || "2.0");

      setSettingsVersion(config.version || "2.0");
      setSettingsMinVersion(config.minNativeVersion || "2.0");
      setSettingsLatestVersion(config.latestNativeVersion || "2.0");
      setSettingsBundleVersion(config.latestBundleVersion || "1.13.5");
      setSettingsReleaseNotes(config.releaseNotes || "");
      setSettingsIndusUrl(config.indusStoreUrl || "");
      setSettingsFirebaseUrl(config.firebaseTesterUrl || "");
    }
  }, [config]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".apk")) {
      toast.error("Please select a valid .apk file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    toast.info(`Selected APK: ${file.name} (${formatFileSize(file.size)})`);
  };

  const handleUploadApk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select an APK file to upload");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("version", uploadVersion || config?.version || "2.0");
      formData.append("minNativeVersion", uploadMinVersion || config?.minNativeVersion || "2.0");
      formData.append("latestNativeVersion", uploadLatestVersion || config?.latestNativeVersion || "2.0");
      formData.append("releaseNotes", uploadReleaseNotes);

      const res = await fetch("/api/admin/apk", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload APK");
      }

      toast.success(json.message || "APK uploaded and published successfully");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadReleaseNotes("");
      await mutate();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred while uploading");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      const res = await fetch("/api/admin/apk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: settingsVersion,
          minNativeVersion: settingsMinVersion,
          latestNativeVersion: settingsLatestVersion,
          latestBundleVersion: settingsBundleVersion,
          releaseNotes: settingsReleaseNotes,
          indusStoreUrl: settingsIndusUrl,
          firebaseTesterUrl: settingsFirebaseUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update configuration");
      }

      toast.success("APK update policy & links saved");
      await mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCopyChecksum = () => {
    if (!config?.checksum) return;
    navigator.clipboard.writeText(config.checksum);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyDownloadLink = () => {
    if (typeof window === "undefined") return;
    const directUrl = `${window.location.origin}/api/app-download`;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.info("Direct APK link copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto w-full p-4 sm:p-6">
        <div className="h-8 w-64 bg-slate-200 animate-pulse rounded" />
        <div className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            APK &amp; App Releases
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage the Android APK binary, upload new releases, and configure app update version policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Download Page
          </a>
          <button
            type="button"
            onClick={() => mutate()}
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card 1: Current Live APK Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">Active Android Release</h2>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Live on Server
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Served directly at <code className="text-slate-700 font-mono">/downloads/mirror-mess.apk</code> and via API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDownloadLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Link Copied" : "Copy Link"}</span>
            </button>

            <a
              href="/api/app-download"
              download="MirrorMess-v2.0.apk"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download APK
            </a>
          </div>
        </div>

        {/* Status Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px]">Published Version</span>
            <span className="font-bold text-slate-900 text-base">v{config?.version || "2.0"}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px]">APK File Size</span>
            <span className="font-semibold text-slate-800 text-sm">{formatFileSize(config?.fileSize || 0)}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px]">Min Supported Version</span>
            <span className="font-semibold text-slate-800 text-sm">v{config?.minNativeVersion || "2.0"}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px]">Last Updated</span>
            <span className="font-semibold text-slate-800 text-sm truncate block">
              {config?.uploadedAt ? format(new Date(config.uploadedAt), "dd MMM yyyy, HH:mm") : "-"}
            </span>
          </div>
        </div>

        {/* SHA-256 Checksum Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">SHA-256 Package Checksum:</span>
            <button
              type="button"
              onClick={handleCopyChecksum}
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              {copiedHash ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Hash</span>
                </>
              )}
            </button>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
            {config?.checksum || "None"}
          </div>
        </div>

        {/* Release Notes */}
        {config?.releaseNotes && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="text-slate-400 block text-[11px] font-medium">Release Notes:</span>
            <p className="text-slate-700 leading-relaxed">{config.releaseNotes}</p>
          </div>
        )}
      </div>

      {/* 2-Column: Upload Form & Version Policy Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Upload New APK */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Upload className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Upload New APK Build</h2>
          </div>

          <form onSubmit={handleUploadApk} className="space-y-4 text-xs">
            {/* File Input */}
            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 block">
                Select .apk File <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                onChange={handleFileSelect}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer border border-slate-200 rounded-lg p-2"
              />
              {selectedFile && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  ✓ {selectedFile.name} ({formatFileSize(selectedFile.size)}) ready to upload
                </p>
              )}
            </div>

            {/* Version Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Release Version</label>
                <input
                  type="text"
                  placeholder="e.g. 2.1"
                  value={uploadVersion}
                  onChange={(e) => setUploadVersion(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Min Supported APK</label>
                <input
                  type="text"
                  placeholder="e.g. 2.0"
                  value={uploadMinVersion}
                  onChange={(e) => setUploadMinVersion(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Release Notes */}
            <div className="space-y-1">
              <label className="font-medium text-slate-700 block">Release Notes / Changelog</label>
              <textarea
                rows={3}
                placeholder="What changed in this build?"
                value={uploadReleaseNotes}
                onChange={(e) => setUploadReleaseNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading &amp; Computing Checksum...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload &amp; Publish APK</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Version Policy & Store Links */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings2 className="w-4 h-4 text-slate-700" />
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Update Policy &amp; Store Links</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Min Native Version</label>
                <input
                  type="text"
                  value={settingsMinVersion}
                  onChange={(e) => setSettingsMinVersion(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400">Below this: hard blocked</span>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Latest Native Version</label>
                <input
                  type="text"
                  value={settingsLatestVersion}
                  onChange={(e) => setSettingsLatestVersion(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400">Below this: update banner</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-700 block">Indus Appstore URL</label>
              <input
                type="url"
                value={settingsIndusUrl}
                onChange={(e) => setSettingsIndusUrl(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-700 block">Firebase Tester URL</label>
              <input
                type="url"
                value={settingsFirebaseUrl}
                onChange={(e) => setSettingsFirebaseUrl(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-700 block">Active Release Notes</label>
              <textarea
                rows={2}
                value={settingsReleaseNotes}
                onChange={(e) => setSettingsReleaseNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Policy...</span>
                </>
              ) : (
                <span>Save Version Policy</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
