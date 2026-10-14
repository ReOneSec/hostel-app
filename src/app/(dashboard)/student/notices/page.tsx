"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Megaphone,
  Globe,
  Building2,
  User,
  Pin,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  RotateCw,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Notice {
  id: string;
  title: string;
  body: string;
  audience: "GLOBAL" | "HOSTEL" | "PRIVATE";
  hostelId?: string;
  hostelName?: string;
  isPinned: boolean;
  expiresAt: string | null;
  read: boolean;
  createdAt: string;
}

interface NoticesData {
  global: Notice[];
  hostel: Notice[];
  private: Notice[];
}

export default function StudentNoticesPage() {
  const [notices, setNotices] = useState<NoticesData>({
    global: [],
    hostel: [],
    private: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "global" | "hostel" | "private">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadNotices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/announcements?scope=mine");
      const json = await res.json();
      if (json.success && json.data) {
        setNotices({
          global: json.data.global || [],
          hostel: json.data.hostel || [],
          private: json.data.private || [],
        });
      } else {
        toast.error(json.error || "Failed to load notices");
      }
    } catch {
      toast.error("Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const markAsRead = async (noticeId: string) => {
    try {
      const res = await fetch(`/api/announcements/${noticeId}/read`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        // Update local state
        setNotices((prev) => ({
          global: prev.global.map((n) => (n.id === noticeId ? { ...n, read: true } : n)),
          hostel: prev.hostel.map((n) => (n.id === noticeId ? { ...n, read: true } : n)),
          private: prev.private.map((n) => (n.id === noticeId ? { ...n, read: true } : n)),
        }));
      }
    } catch {
      // silent
    }
  };

  const handleExpand = (noticeId: string, isRead: boolean) => {
    setExpandedId((prev) => (prev === noticeId ? null : noticeId));
    if (!isRead) {
      markAsRead(noticeId);
    }
  };

  // Combine notices based on active tab
  const getFilteredNotices = (): Notice[] => {
    let list: Notice[] = [];
    if (activeTab === "all" || activeTab === "global") {
      list = [...list, ...notices.global];
    }
    if (activeTab === "all" || activeTab === "hostel") {
      list = [...list, ...notices.hostel];
    }
    if (activeTab === "all" || activeTab === "private") {
      list = [...list, ...notices.private];
    }

    // Sort: pinned first, then by date descending
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  };

  const allNotices = getFilteredNotices();
  const unreadCount = [...notices.global, ...notices.hostel, ...notices.private].filter(
    (n) => !n.read
  ).length;

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case "GLOBAL":
        return <Globe className="w-3.5 h-3.5" />;
      case "HOSTEL":
        return <Building2 className="w-3.5 h-3.5" />;
      case "PRIVATE":
        return <User className="w-3.5 h-3.5" />;
      default:
        return <Megaphone className="w-3.5 h-3.5" />;
    }
  };

  const getAudienceStyle = (audience: string) => {
    switch (audience) {
      case "GLOBAL":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
      case "HOSTEL":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
      case "PRIVATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getAudienceLabel = (notice: Notice) => {
    switch (notice.audience) {
      case "GLOBAL":
        return "All Students";
      case "HOSTEL":
        return notice.hostelName || "Your Hostel";
      case "PRIVATE":
        return "For You Only";
      default:
        return notice.audience;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg">
              <BellRing className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Notices & Announcements
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-blue-600 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Stay updated with hostel notices, important announcements, and personal messages.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadNotices}
          disabled={isLoading}
          className="flex items-center gap-1.5"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { key: "all", label: "All Notices", count: [...notices.global, ...notices.hostel, ...notices.private].length },
              { key: "global", label: "Global", count: notices.global.length },
              { key: "hostel", label: "Hostel", count: notices.hostel.length },
              { key: "private", label: "Personal", count: notices.private.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notices List */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-sm">Loading announcements...</p>
          </div>
        ) : allNotices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-full">
              <Megaphone className="w-8 h-8 opacity-40 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No notices yet
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                When your hostel or admins send announcements, they&rsquo;ll appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allNotices.map((notice) => {
              const isExpanded = expandedId === notice.id;

              return (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => handleExpand(notice.id, notice.read)}
                  className={`w-full text-left p-4 md:p-5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer ${
                    notice.isPinned ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                  } ${!notice.read ? "bg-blue-50/40 dark:bg-blue-950/10" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Read indicator */}
                    <div className="mt-1 shrink-0">
                      {notice.read ? (
                        <CheckCircle2 className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-blue-500 fill-blue-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {notice.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Pin className="w-3 h-3 fill-current" />
                            Pinned
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${getAudienceStyle(
                            notice.audience
                          )}`}
                        >
                          {getAudienceIcon(notice.audience)}
                          {getAudienceLabel(notice)}
                        </span>

                        {!notice.read && (
                          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            New
                          </span>
                        )}

                        <span className="text-xs text-slate-400">
                          {format(new Date(notice.createdAt), "MMM d, yyyy • h:mm a")}
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        className={`text-sm leading-snug ${
                          notice.read
                            ? "font-medium text-slate-700 dark:text-slate-300"
                            : "font-semibold text-slate-900 dark:text-white"
                        }`}
                      >
                        {notice.title}
                      </h3>

                      {/* Body - truncated or full */}
                      <p
                        className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap ${
                          isExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {notice.body}
                      </p>

                      {/* Expiry */}
                      {notice.expiresAt && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 pt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Expires {format(new Date(notice.expiresAt), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
