"use client";

import { useEffect, useState, useMemo } from "react";
import { format, addDays, isPast } from "date-fns";
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  PinOff,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  User,
  Globe,
  Clock,
  RotateCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-auth";

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: "GLOBAL" | "HOSTEL" | "PRIVATE";
  hostelId: string | null;
  hostel?: { id: string; name: string } | null;
  targetUserId: string | null;
  targetUser?: {
    id: string;
    username: string;
    email: string;
    studentProfile?: { fullName: string } | null;
  } | null;
  senderId: string;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  _count?: { reads: number };
}

interface Hostel {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  username: string;
  email: string;
  studentProfile?: { fullName: string } | null;
}

export default function AdminNoticesPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentLabel, setSelectedStudentLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filterAudience, setFilterAudience] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAudience, setComposeAudience] = useState<"GLOBAL" | "HOSTEL" | "PRIVATE">("GLOBAL");
  const [composeHostelId, setComposeHostelId] = useState("");
  const [composeTargetUserId, setComposeTargetUserId] = useState("");
  const [composeIsPinned, setComposeIsPinned] = useState(false);
  const [composeExpiresAt, setComposeExpiresAt] = useState<string>("");

  // Edit Modal State
  const [editingNotice, setEditingNotice] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editExpiresAt, setEditExpiresAt] = useState<string>("");

  // Delete Confirm State
  const [deletingNotice, setDeletingNotice] = useState<Announcement | null>(null);

  // Fetch notices
  const loadNotices = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/announcements");
      const json = await res.json();
      if (json.success) {
        setAnnouncements(json.data || []);
      } else {
        toast.error(json.error || "Failed to load notices");
      }
    } catch {
      toast.error("Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch hostels
  const loadHostels = async () => {
    try {
      const res = await fetch("/api/hostels");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHostels(json.data);
        if (json.data.length > 0 && !isSuperAdmin) {
          setComposeHostelId(json.data[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  // Search students for PRIVATE notices
  useEffect(() => {
    if (composeAudience !== "PRIVATE") return;
    const timer = setTimeout(async () => {
      try {
        const query = studentSearch.trim();
        const url = query
          ? `/api/users?role=STUDENT&status=ACTIVE&search=${encodeURIComponent(query)}&perPage=100`
          : `/api/users?role=STUDENT&status=ACTIVE&perPage=100`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          const list = json.data?.data || json.data?.items || (Array.isArray(json.data) ? json.data : []);
          setStudents(Array.isArray(list) ? list : []);
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch, composeAudience]);

  useEffect(() => {
    loadNotices();
    loadHostels();
  }, []);

  // Pre-fill soft default (+30 days) when opening compose
  const openComposeModal = () => {
    setComposeTitle("");
    setComposeBody("");
    setComposeAudience(isSuperAdmin ? "GLOBAL" : "HOSTEL");
    if (hostels.length > 0) {
      setComposeHostelId(hostels[0].id);
    }
    setComposeTargetUserId("");
    setSelectedStudentLabel("");
    setComposeIsPinned(false);
    const softExpiry = format(addDays(new Date(), 30), "yyyy-MM-dd");
    setComposeExpiresAt(softExpiry);
    setIsComposeOpen(true);
  };

  // Submit Compose
  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTitle.trim() || !composeBody.trim()) {
      toast.error("Title and body are required");
      return;
    }

    if (composeAudience === "HOSTEL" && !composeHostelId) {
      toast.error("Please select a hostel");
      return;
    }

    if (composeAudience === "PRIVATE" && !composeTargetUserId) {
      toast.error("Please select a target student");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        title: composeTitle.trim(),
        body: composeBody.trim(),
        audience: composeAudience,
        isPinned: composeIsPinned,
      };

      if (composeAudience === "HOSTEL") {
        payload.hostelId = composeHostelId;
      } else if (composeAudience === "PRIVATE") {
        payload.targetUserId = composeTargetUserId;
      }

      if (composeExpiresAt) {
        payload.expiresAt = new Date(`${composeExpiresAt}T23:59:59Z`).toISOString();
      }

      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create announcement");
      }

      toast.success("Notice published successfully!");
      setIsComposeOpen(false);
      loadNotices();
    } catch (err: any) {
      toast.error(err.message || "Failed to compose notice");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Dialog
  const openEditModal = (notice: Announcement) => {
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditBody(notice.body);
    setEditIsPinned(notice.isPinned);
    setEditExpiresAt(
      notice.expiresAt ? format(new Date(notice.expiresAt), "yyyy-MM-dd") : ""
    );
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice) return;

    try {
      setIsSubmitting(true);
      const payload: any = {
        title: editTitle.trim(),
        body: editBody.trim(),
        isPinned: editIsPinned,
        expiresAt: editExpiresAt
          ? new Date(`${editExpiresAt}T23:59:59Z`).toISOString()
          : null,
      };

      const res = await fetch(`/api/announcements/${editingNotice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update announcement");
      }

      toast.success("Notice updated successfully");
      setEditingNotice(null);
      loadNotices();
    } catch (err: any) {
      toast.error(err.message || "Failed to update notice");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (notice: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${notice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !notice.isPinned }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to toggle pin state");
      }
      toast.success(notice.isPinned ? "Notice unpinned" : "Notice pinned to top");
      loadNotices();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle pin");
    }
  };

  // Extend Expiry +30 Days
  const handleExtendExpiry = async (notice: Announcement) => {
    try {
      const currentExpiry = notice.expiresAt ? new Date(notice.expiresAt) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = addDays(baseDate, 30);

      const res = await fetch(`/api/announcements/${notice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresAt: newExpiry.toISOString() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to extend expiry");
      }
      toast.success("Notice extended by +30 days");
      loadNotices();
    } catch (err: any) {
      toast.error(err.message || "Failed to extend expiry");
    }
  };

  // Delete Notice
  const handleDeleteNotice = async () => {
    if (!deletingNotice) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/announcements/${deletingNotice.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete notice");
      }
      toast.success("Notice deleted");
      setDeletingNotice(null);
      loadNotices();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete notice");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Notices
  const filteredNotices = useMemo(() => {
    return announcements.filter((item) => {
      if (filterAudience !== "ALL" && item.audience !== filterAudience) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesBody = item.body.toLowerCase().includes(q);
        const matchesTarget =
          item.hostel?.name.toLowerCase().includes(q) ||
          item.targetUser?.studentProfile?.fullName?.toLowerCase().includes(q) ||
          item.targetUser?.username?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody && !matchesTarget) return false;
      }
      return true;
    });
  }, [announcements, filterAudience, searchQuery]);

  // Summary counts
  const stats = useMemo(() => {
    const total = announcements.length;
    const pinned = announcements.filter((a) => a.isPinned).length;
    const expired = announcements.filter((a) => a.expiresAt && isPast(new Date(a.expiresAt))).length;
    const active = total - expired;
    return { total, pinned, expired, active };
  }, [announcements]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg">
              <Megaphone className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Announcements & Notices
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Publish three-tier broadcast messages to all students, specific hostels, or individual students.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
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

          <Button
            onClick={openComposeModal}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Send Notice
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Broadcasts
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Active Notices
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Pinned to Top
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.pinned}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-rose-500 uppercase tracking-wider">
            Expired Notices
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.expired}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(["ALL", "GLOBAL", "HOSTEL", "PRIVATE"] as const).map((aud) => (
            <button
              key={aud}
              onClick={() => setFilterAudience(aud)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                filterAudience === aud
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {aud === "ALL" ? "All Tiers" : aud === "GLOBAL" ? "Global Only" : aud === "HOSTEL" ? "Hostel Only" : "Private Only"}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search notices or targets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Notices List */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-sm">Loading announcements...</p>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Megaphone className="w-8 h-8 opacity-40 text-slate-400" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No notices match your filters
            </p>
            <p className="text-xs text-slate-400">Click &ldquo;Send Notice&rdquo; to publish your first announcement.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotices.map((notice) => {
              const hasExpired = notice.expiresAt && isPast(new Date(notice.expiresAt));

              return (
                <div
                  key={notice.id}
                  className={`p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
                    notice.isPinned ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {notice.isPinned && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Pin className="w-3 h-3 fill-current" />
                          Pinned
                        </span>
                      )}

                      {/* Audience Badge */}
                      {notice.audience === "GLOBAL" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <Globe className="w-3 h-3" />
                          Global Notice
                        </span>
                      )}

                      {notice.audience === "HOSTEL" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Building2 className="w-3 h-3" />
                          {notice.hostel?.name || "Hostel Notice"}
                        </span>
                      )}

                      {notice.audience === "PRIVATE" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <User className="w-3 h-3" />
                          {notice.targetUser?.studentProfile?.fullName ||
                            notice.targetUser?.username ||
                            "Private Student"}
                        </span>
                      )}

                      {hasExpired && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <AlertCircle className="w-3 h-3" />
                          Expired
                        </span>
                      )}

                      <span className="text-xs text-slate-400">
                        {format(new Date(notice.createdAt), "MMM d, yyyy • h:mm a")}
                      </span>
                    </div>

                    <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                      {notice.title}
                    </h2>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-3xl leading-relaxed">
                      {notice.body}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {notice.expiresAt
                          ? `Expires ${format(new Date(notice.expiresAt), "MMM d, yyyy")}`
                          : "No expiration set"}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      title={notice.isPinned ? "Unpin notice" : "Pin notice"}
                      onClick={() => handleTogglePin(notice)}
                      className={`h-8 px-2.5 text-xs ${
                        notice.isPinned
                          ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                      }`}
                    >
                      {notice.isPinned ? (
                        <>
                          <PinOff className="w-3.5 h-3.5 mr-1" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5 mr-1" />
                          Pin
                        </>
                      )}
                    </Button>

                    {hasExpired && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtendExpiry(notice)}
                        className="h-8 px-2.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400"
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Extend +30d
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      title="Edit Notice"
                      onClick={() => openEditModal(notice)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete Notice"
                      onClick={() => setDeletingNotice(notice)}
                      className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose Notice Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="w-5 h-5 text-blue-600" />
              Compose Notice
            </DialogTitle>
            <DialogDescription>
              Create a new announcement for students. The audience determines who can see this broadcast.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleComposeSubmit} className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Notice Title <span className="text-red-500">*</span>
                </label>
                <span className="text-slate-400">{composeTitle.length}/120</span>
              </div>
              <Input
                placeholder="e.g. Water Tank Cleaning & Shutdown Saturday"
                value={composeTitle}
                maxLength={120}
                onChange={(e) => setComposeTitle(e.target.value)}
                required
              />
            </div>

            {/* Audience Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Audience Tier <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setComposeAudience("GLOBAL")}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      composeAudience === "GLOBAL"
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Globe className="w-4 h-4 mb-1" />
                    All Students
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setComposeAudience("HOSTEL")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    composeAudience === "HOSTEL"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Building2 className="w-4 h-4 mb-1" />
                  One Hostel
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setComposeAudience("PRIVATE")}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      composeAudience === "PRIVATE"
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <User className="w-4 h-4 mb-1" />
                    Private Student
                  </button>
                )}
              </div>
            </div>

            {/* Target Selectors */}
            {composeAudience === "HOSTEL" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Hostel <span className="text-red-500">*</span>
                </label>
                <Select value={composeHostelId} onValueChange={(val) => setComposeHostelId(val || "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a managed hostel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hostels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {composeAudience === "PRIVATE" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Search & Select Student <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Type student name or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="mb-1 text-xs"
                />
                <Select
                  value={composeTargetUserId}
                  onValueChange={(val) => {
                    setComposeTargetUserId(val || "");
                    const match = students.find((s) => s.id === val);
                    if (match) {
                      setSelectedStudentLabel(
                        `${match.studentProfile?.fullName || match.username} (${match.email})`
                      );
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose from search results...">
                      {selectedStudentLabel || "Choose from search results..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.studentProfile?.fullName || s.username} ({s.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Message Body (Plain Text) <span className="text-red-500">*</span>
                </label>
                <span className="text-slate-400">{composeBody.length}/2000</span>
              </div>
              <Textarea
                placeholder="Type your message here. URLs will be rendered as plain text."
                rows={4}
                maxLength={2000}
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                required
              />
            </div>

            {/* Pin and Expiry Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-white cursor-pointer" htmlFor="pinToggle">
                    Pin Notice
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Auto-unpins previous notice in this scope
                  </p>
                </div>
                <input
                  id="pinToggle"
                  type="checkbox"
                  checked={composeIsPinned}
                  onChange={(e) => setComposeIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Expiry Date (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setComposeExpiresAt(format(addDays(new Date(), 30), "yyyy-MM-dd"))}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    +30 days
                  </button>
                </div>
                <Input
                  type="date"
                  value={composeExpiresAt}
                  onChange={(e) => setComposeExpiresAt(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsComposeOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Broadcasting...
                  </>
                ) : (
                  "Publish Notice"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Notice Dialog */}
      <Dialog open={Boolean(editingNotice)} onOpenChange={(open) => !open && setEditingNotice(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit2 className="w-5 h-5 text-blue-600" />
              Edit Notice
            </DialogTitle>
            <DialogDescription>
              Update notice title, message text, pinned state, or expiry date.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Title</label>
                <span className="text-slate-400">{editTitle.length}/120</span>
              </div>
              <Input
                value={editTitle}
                maxLength={120}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Message Body</label>
                <span className="text-slate-400">{editBody.length}/2000</span>
              </div>
              <Textarea
                rows={4}
                maxLength={2000}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-white cursor-pointer" htmlFor="editPinToggle">
                    Pin Notice
                  </label>
                  <p className="text-[11px] text-slate-500">Auto-unpins others in scope</p>
                </div>
                <input
                  id="editPinToggle"
                  type="checkbox"
                  checked={editIsPinned}
                  onChange={(e) => setEditIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Expiry Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditExpiresAt(format(addDays(new Date(), 30), "yyyy-MM-dd"))}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    +30 days
                  </button>
                </div>
                <Input
                  type="date"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingNotice(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deletingNotice)} onOpenChange={(open) => !open && setDeletingNotice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Confirm Notice Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this notice? Students will immediately stop seeing it.
            </DialogDescription>
          </DialogHeader>

          {deletingNotice && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border text-xs space-y-1">
              <p className="font-semibold text-slate-900 dark:text-white">{deletingNotice.title}</p>
              <p className="text-slate-500 line-clamp-2">{deletingNotice.body}</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDeletingNotice(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteNotice}
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
