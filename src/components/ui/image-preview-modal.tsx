"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, ExternalLink, Download } from "lucide-react";

export interface ImagePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  src: string | null | undefined;
  alt?: string;
  status?: string | null;
  fileName?: string;
}

export function ImagePreviewModal({
  open,
  onOpenChange,
  title,
  subtitle,
  src,
  alt,
  status,
  fileName,
}: ImagePreviewModalProps) {
  if (!src) return null;

  const isPdf =
    src.toLowerCase().endsWith(".pdf") ||
    fileName?.toLowerCase().endsWith(".pdf");

  const getStatusBadgeClass = (s: string) => {
    const upper = s.toUpperCase();
    if (upper === "APPROVED" || upper === "VERIFIED" || upper === "SUCCESS" || upper === "PAID") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (upper === "REJECTED" || upper === "FAILED") {
      return "bg-red-50 text-red-700 border border-red-200";
    }
    if (upper === "PENDING") {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription className="text-xs text-slate-500">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Main preview frame */}
          <div className="max-h-[60vh] min-h-[220px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 flex items-center justify-center p-2">
            {isPdf ? (
              <iframe
                src={src}
                title={title}
                className="w-full h-[55vh] rounded-lg border-0 bg-white"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt || title}
                className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg select-none"
              />
            )}
          </div>

          {/* Footer bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {status ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Status:</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${getStatusBadgeClass(
                    status
                  )}`}
                >
                  {status}
                </span>
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center h-8 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open in New Tab
              </a>
              <a
                href={src}
                download={fileName || title || "download"}
                className="inline-flex items-center h-8 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
