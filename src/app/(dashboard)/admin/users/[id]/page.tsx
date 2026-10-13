"use client";

import { useEffect, useState, use } from "react";
import { DetailPageSkeleton } from "@/components/skeletons/page-skeletons";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock, FileText, Loader2, MapPin, Phone, Shield, User, KeyRound, Building2, Mail, Pencil, CheckCircle2, XCircle, Calendar, CalendarPlus, Trash, Edit, Download, Lock, Unlock, Camera, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";

// Role Badge
function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    SUPER_ADMIN: { label: "Super Admin", className: "bg-rose-50 text-rose-700 border-rose-200" },
    HOSTEL_MANAGER: { label: "Manager", className: "bg-green-50 text-green-800 border-green-200" },
    MONTHLY_MANAGER: { label: "Monthly Mgr", className: "bg-amber-50 text-amber-800 border-amber-200" },
    STUDENT: { label: "Student", className: "bg-blue-50 text-blue-700 border-blue-200" },
  };
  const c = config[role] || config.STUDENT;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      {c.label}
    </span>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; dot: string; className: string }> = {
    ACTIVE: { label: "Active", dot: "bg-green-500", className: "bg-green-50 text-green-800 border-green-200" },
    INACTIVE: { label: "Inactive", dot: "bg-slate-400", className: "bg-slate-50 text-slate-500 border-slate-200" },
    SUSPENDED: { label: "Suspended", dot: "bg-rose-400", className: "bg-rose-50 text-rose-700 border-rose-200" },
  };
  const c = config[status] || { label: status, dot: "bg-slate-400", className: "bg-slate-50 text-slate-500 border-slate-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
}

export default function UserDetailPage({ params }: { params?: Promise<{ id: string }> }) {
  const routeParams = useParams();
  const router = useRouter();
  const id = (routeParams?.id as string) || (params ? use(params)?.id : "");

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newRemark, setNewRemark] = useState("");
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [isEditJoiningDateOpen, setIsEditJoiningDateOpen] = useState(false);
  const [newJoiningDate, setNewJoiningDate] = useState("");
  const [isUpdatingJoiningDate, setIsUpdatingJoiningDate] = useState(false);
  const [isEditEmailOpen, setIsEditEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editingRemarkContent, setEditingRemarkContent] = useState("");
  const [isUpdatingRemark, setIsUpdatingRemark] = useState(false);
  const [isDeletingRemark, setIsDeletingRemark] = useState<string | null>(null);

  // Selfie Recapture Permission state
  const [isGrantSelfieOpen, setIsGrantSelfieOpen] = useState(false);
  const [selfiePermissionReason, setSelfiePermissionReason] = useState("");
  const [isUpdatingSelfiePermission, setIsUpdatingSelfiePermission] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    title: string;
    subtitle?: string;
    src: string;
    status?: string;
    fileName?: string;
  } | null>(null);

  async function handleToggleSelfiePermission(canRecapture: boolean) {
    if (canRecapture && (!selfiePermissionReason.trim() || selfiePermissionReason.trim().length < 3)) {
      toast.error("Please provide a proper reason for granting permission (min 3 chars).");
      return;
    }

    setIsUpdatingSelfiePermission(true);
    try {
      const res = await fetch(`/api/users/${user.id}/selfie-permission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canRecapture,
          reason: selfiePermissionReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update permission");

      toast.success(json.message || "Selfie permission updated successfully");
      setIsGrantSelfieOpen(false);
      setSelfiePermissionReason("");
      await fetchUser(id);
    } catch (err: any) {
      toast.error(err.message || "Failed to update permission");
    } finally {
      setIsUpdatingSelfiePermission(false);
    }
  }

  useEffect(() => {
    if (id) {
      fetchUser(id);
    }
  }, [id]);

  async function fetchUser(targetId?: string) {
    const fetchId = targetId || id;
    if (!fetchId) return;

    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/users/${fetchId}?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorStatus(res.status);
        const msg =
          json?.error ||
          (res.status === 403
            ? "Access Denied: Administrative permissions required."
            : res.status === 404
            ? "User not found"
            : "Could not load user details");
        setErrorMessage(msg);
        throw new Error(msg);
      }

      setUser(json.data);
    } catch (error: any) {
      toast.error(error.message || "Could not load user details.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!confirm("Are you sure you want to reset this user's password? An email will be sent immediately.")) return;
    
    setIsResetting(true);
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Password reset successfully. Email sent.");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`Are you sure you want to mark this user as ${newStatus}?`)) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`User status updated to ${newStatus}`);
      fetchUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleAddRemark() {
    if (!newRemark.trim()) return;
    setIsSubmittingRemark(true);
    try {
      const res = await fetch(`/api/users/${user.id}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newRemark.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Remark added");
      setNewRemark("");
      fetchUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to add remark");
    } finally {
      setIsSubmittingRemark(false);
    }
  }

  async function handleUpdateRemark(remarkId: string) {
    if (!editingRemarkContent.trim()) return;
    setIsUpdatingRemark(true);
    try {
      const res = await fetch(`/api/users/${user?.id}/remarks/${remarkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingRemarkContent }),
      });
      if (!res.ok) throw new Error("Failed to update remark");
      toast.success("Remark updated");
      setEditingRemarkId(null);
      setEditingRemarkContent("");
      fetchUser();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdatingRemark(false);
    }
  }

  async function handleDeleteRemark(remarkId: string) {
    if (!confirm("Are you sure you want to delete this remark?")) return;
    setIsDeletingRemark(remarkId);
    try {
      const res = await fetch(`/api/users/${user?.id}/remarks/${remarkId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete remark");
      toast.success("Remark deleted");
      fetchUser();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeletingRemark(null);
    }
  }

  async function handleUpdateJoiningDate() {
    setIsUpdatingJoiningDate(true);
    try {
      const res = await fetch(`/api/users/${user.id}/joining-date`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joiningDate: newJoiningDate ? new Date(newJoiningDate).toISOString() : null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Joining date updated");
      setIsEditJoiningDateOpen(false);
      fetchUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to update joining date");
    } finally {
      setIsUpdatingJoiningDate(false);
    }
  }

  async function handleUpdateEmail(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (trimmed === user.email.toLowerCase()) {
      toast.error("New email is identical to current email");
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await fetch(`/api/users/${user.id}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update email");

      toast.success("Email address updated successfully");
      setIsEditEmailOpen(false);
      fetchUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setIsUpdatingEmail(false);
    }
  }

  async function handleDownloadPDF() {
    setIsGeneratingPDF(true);
    try {
      const { generateAdmissionFormPDF } = await import("@/lib/pdf-generator");
      await generateAdmissionFormPDF(user);
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!user) {
    if (errorStatus === 403 || errorStatus === 401) {
      return (
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm max-w-xl mx-auto my-12 overflow-hidden">
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-4 text-rose-600 ring-8 ring-rose-50/50">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1.5">Access Denied (Admin Permissions Required)</h2>
            <p className="text-sm text-slate-600 max-w-md mb-2">
              {errorMessage || "You do not have permission to view this user profile."}
            </p>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              This profile is restricted to Super Administrators and authorized Hostel Managers. If you are currently logged in as a student or another user account, please sign in with an administrator account to view details.
            </p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 cursor-pointer"
                onClick={() => router.push(`/login?callbackUrl=/admin/users/${id}`)}
              >
                Sign In as Administrator
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-700 rounded-lg cursor-pointer"
                onClick={() => router.push("/")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (errorStatus === 404) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-xl mx-auto my-12 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
              <User className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">User Not Found</h3>
            <p className="text-sm text-slate-500 max-w-xs mb-2">The user you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            {id && (
              <p className="font-mono text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md mb-6">
                User ID: {id}
              </p>
            )}
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
              onClick={() => router.push("/admin/users")}
            >
              Return to User List
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm max-w-xl mx-auto my-12 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 text-amber-600">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Unable to Load User</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            {errorMessage || "An unexpected error occurred while loading this user."}
          </p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
              onClick={() => fetchUser(id)}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 rounded-lg cursor-pointer"
              onClick={() => router.push("/admin/users")}
            >
              Return to User List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.studentProfile?.fullName || user.username;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/users")}
              className="rounded-full shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {getInitials(displayName)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {displayName}
                </h1>
                <StatusBadge status={user.status} />
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="inline-flex items-center gap-1.5 text-sm text-slate-500 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2 py-0.5 rounded-lg transition-colors group">
                  <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="font-mono text-xs text-slate-600">{user.email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewEmail(user.email);
                      setIsEditEmailOpen(true);
                    }}
                    className="ml-1 p-0.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-all cursor-pointer"
                    title="Change Email Address"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewEmail(user.email);
                setIsEditEmailOpen(true);
              }}
              className="h-8 rounded-lg text-xs border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Change Email</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF || !user.isProfileComplete}
              title={!user.isProfileComplete ? "Profile incomplete" : "Download Admission Form"}
              className="h-8 rounded-lg text-xs border-slate-200 text-slate-600 cursor-pointer"
            >
              {isGeneratingPDF ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
              <span className="hidden sm:inline">Admission Form</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus}
              className="h-8 rounded-lg text-xs border-slate-200 text-slate-600 cursor-pointer"
            >
              {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
            <Button
              size="sm"
              onClick={handleResetPassword}
              disabled={isResetting}
              className="h-8 rounded-lg text-xs bg-red-500 hover:bg-red-600 text-white cursor-pointer"
            >
              {isResetting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 mr-1.5" />}
              Reset Password
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column - Core Info */}
        <div className="space-y-5">
          {/* Account Info Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Account Information</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { icon: Shield, iconBg: "bg-blue-50", iconColor: "text-blue-600", label: "Role", value: user.role.replace(/_/g, " ") },
                { icon: user.isProfileComplete ? CheckCircle2 : XCircle, iconBg: user.isProfileComplete ? "bg-green-50" : "bg-amber-50", iconColor: user.isProfileComplete ? "text-green-600" : "text-amber-600", label: "Profile Status", value: user.isProfileComplete ? "Complete" : "Incomplete" },
                { icon: CalendarPlus, iconBg: "bg-blue-50", iconColor: "text-blue-600", label: "Created At", value: format(new Date(user.createdAt), "MMM d, yyyy") },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className={`p-2 rounded-lg ${item.iconBg}`}>
                    <item.icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                  </div>
                </div>
              ))}

              {/* Joining Date - editable */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                      Joining Date
                      {!user.joiningDate && <span className="ml-1 normal-case tracking-normal">(Default)</span>}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {format(new Date(user.joiningDate || user.studentProfile?.completedAt || user.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <button
                  className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => {
                    const dateToEdit = user.joiningDate || user.studentProfile?.completedAt || user.createdAt;
                    setNewJoiningDate(dateToEdit ? new Date(dateToEdit).toISOString().split("T")[0] : "");
                    setIsEditJoiningDateOpen(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Current Hostel */}
          {(() => {
            const activeHostelAssignment = user.hostelAssignments?.find((a: any) => a.status === "ACTIVE");
            return activeHostelAssignment ? (
              <div className="bg-white rounded-xl border border-blue-200 shadow-sm ring-1 ring-blue-100/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-blue-700">Current Hostel</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/users/${user.id}/assign`)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2 rounded-lg text-xs cursor-pointer"
                  >
                    Transfer
                  </Button>
                </div>
                <div className="p-5">
                  <p className="text-lg font-bold text-slate-900">{activeHostelAssignment.hostel.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Room {user.roomAssignments?.[0]?.room.roomNumber || "N/A"} • Bed {user.bedAssignments?.[0]?.bed.bedLabel || "N/A"}
                  </p>
                </div>
              </div>
            ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-500">No Active Assignment</h3>
              </div>
              <div className="p-5">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                  onClick={() => router.push(`/admin/users/${user.id}/assign`)}
                >
                  Assign to Hostel
                </Button>
              </div>
            </div>
          ); })()}

          {/* Selfie */}
          {user.selfies?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Current Selfie</h3>
                </div>
                {user.canRecaptureSelfie ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                    Recapture Allowed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                    Verified
                  </span>
                )}
              </div>
              <div className="p-5 space-y-4">
                <div
                  onClick={() => setPreviewImage({
                    title: `Current Selfie - ${displayName}`,
                    subtitle: `Captured on ${format(new Date(user.selfies[0].capturedAt), "dd MMMM yyyy HH:mm")}`,
                    src: user.selfies[0].fileUrl,
                    status: user.canRecaptureSelfie ? "RECAPTURE ALLOWED" : "VERIFIED",
                    fileName: `${user.username || "user"}-selfie.jpg`
                  })}
                  className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer group"
                  title="Click to preview selfie within this tab"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.selfies[0].fileUrl}
                    alt="User selfie"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/95 text-slate-900 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> View Photo
                    </span>
                  </div>
                </div>

                {/* Timestamp & Geolocation Coordinates with Google Maps Link */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Captured:</span>
                    <span className="font-medium text-slate-800">
                      {format(new Date(user.selfies[0].capturedAt), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Coordinates:</span>
                      <span className="font-mono text-slate-900 font-semibold text-[11px]">
                        {user.selfies[0].latitude != null && user.selfies[0].longitude != null
                          ? `${Number(user.selfies[0].latitude).toFixed(6)}, ${Number(user.selfies[0].longitude).toFixed(6)}`
                          : "Not recorded"}
                      </span>
                    </div>

                    {user.selfies[0].latitude != null && user.selfies[0].longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${user.selfies[0].latitude},${user.selfies[0].longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline mt-1"
                      >
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        Open in Google Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Recapture Permission Action Controls */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  {user.canRecaptureSelfie ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                        <span className="font-bold text-amber-900 block flex items-center gap-1.5">
                          <Unlock className="w-3.5 h-3.5 text-amber-600" />
                          Recapture Permission Active
                        </span>
                        <p className="text-[11px] text-amber-700">
                          <strong>Reason:</strong> &ldquo;{user.selfieRecaptureReason}&rdquo;
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleSelfiePermission(false)}
                        disabled={isUpdatingSelfiePermission}
                        className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                      >
                        {isUpdatingSelfiePermission ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Revoke Recapture Permission
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelfiePermissionReason("");
                        setIsGrantSelfieOpen(true);
                      }}
                      className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" />
                      Grant Recapture Permission
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Details Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 rounded-lg p-1 h-auto">
              <TabsTrigger value="profile" className="text-xs sm:text-sm rounded-md py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Personal Details</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm rounded-md py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Documents</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs sm:text-sm rounded-md py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Lifecycle</TabsTrigger>
              <TabsTrigger value="remarks" className="text-xs sm:text-sm rounded-md py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Remarks</TabsTrigger>
            </TabsList>

            {/* Personal Details Tab */}
            <TabsContent value="profile" className="mt-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Personal Information</h3>
                </div>
                <div className="p-5">
                  {user.studentProfile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {[
                        { icon: User, label: "Full Name", value: user.studentProfile.fullName },
                        { icon: Phone, label: "Mobile", value: user.studentProfile.mobile },
                        { icon: User, label: "Father's Name", value: user.studentProfile.fatherName },
                        { icon: Mail, label: "Personal Email", value: user.studentProfile.personalEmail || "N/A" },
                        { icon: User, label: "Mother's Name", value: user.studentProfile.motherName },
                        { icon: Phone, label: "Alt Mobile", value: user.studentProfile.parentMobile || "N/A" },
                        { icon: User, label: "Gender", value: user.studentProfile.gender?.toLowerCase(), capitalize: true },
                        { icon: Phone, label: "Emergency Contact", value: user.studentProfile.emergencyContact },
                        { icon: User, label: "Blood Group", value: user.studentProfile.bloodGroup },
                        { icon: MapPin, label: "Address", value: user.studentProfile.permanentAddress },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
                          <p className={`text-sm font-medium text-slate-800 ${item.capitalize ? "capitalize" : ""}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">Profile Not Completed</h3>
                      <p className="text-xs text-slate-400">This user hasn&apos;t set up their profile yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Uploaded Documents</h3>
                </div>
                <div className="p-5">
                  {user.documents?.length > 0 ? (
                    <div className="space-y-3">
                      {user.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{doc.documentType}</p>
                              <p className="text-xs text-slate-400">Uploaded {format(new Date(doc.uploadedAt), "MMM d, yyyy")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              doc.status === "APPROVED" ? "bg-green-50 text-green-800 border-green-200" :
                              doc.status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                              "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {doc.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPreviewImage({
                                title: doc.documentType?.replace(/_/g, " ") || "Document",
                                subtitle: `${doc.fileName || doc.documentType} • Uploaded on ${doc.uploadedAt ? format(new Date(doc.uploadedAt), "dd MMMM yyyy") : ""}`,
                                src: doc.fileUrl,
                                status: doc.status,
                                fileName: doc.fileName
                              })}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Preview within this tab"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">No Documents</h3>
                      <p className="text-xs text-slate-400">No documents uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Lifecycle Timeline</h3>
                </div>
                <div className="p-5">
                  {user.lifecycleEvents?.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {user.lifecycleEvents.map((event: any) => (
                        <div key={event.id} className="relative flex gap-4 pl-10">
                          <div className="absolute left-2.5 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-500 shadow-sm z-10" />
                          <div className="flex-1 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-slate-800 capitalize">
                                {event.eventType.replace(/_/g, " ").toLowerCase()}
                              </span>
                              <span className="text-xs text-slate-400">
                                {format(new Date(event.createdAt), "MMM d, yyyy")}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {event.eventType === "TRANSFERRED_IN"
                                ? `Transferred into ${event.toHostel?.name}`
                                : event.eventType === "TRANSFERRED_OUT"
                                ? `Transferred out of ${event.fromHostel?.name}`
                                : "System recorded an event for this user."}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                        <Clock className="w-6 h-6 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-1">No Events</h3>
                      <p className="text-xs text-slate-400">No lifecycle events recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Remarks Tab */}
            <TabsContent value="remarks" className="mt-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">User Remarks</h3>
                </div>
                <div className="p-5 space-y-5">
                  {/* Add Remark */}
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your remark here..."
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      className="min-h-[80px] border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <Button
                      onClick={handleAddRemark}
                      disabled={isSubmittingRemark || !newRemark.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm h-9 cursor-pointer"
                    >
                      {isSubmittingRemark && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      Add Remark
                    </Button>
                  </div>

                  {/* Remarks List */}
                  {(user.remarks?.length ?? 0) > 0 && <div className="border-t border-slate-100 pt-5" />}
                  <div className="space-y-3">
                    {user.remarks?.map((remark: any) => (
                      <div key={remark.id} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 relative group">
                        {editingRemarkId === remark.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editingRemarkContent}
                              onChange={(e) => setEditingRemarkContent(e.target.value)}
                              className="min-h-[80px] border-slate-200 rounded-lg text-sm"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateRemark(remark.id)}
                                disabled={isUpdatingRemark}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-7 cursor-pointer"
                              >
                                {isUpdatingRemark && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setEditingRemarkId(null); setEditingRemarkContent(""); }}
                                disabled={isUpdatingRemark}
                                className="rounded-lg text-xs h-7 border-slate-200 cursor-pointer"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                onClick={() => { setEditingRemarkId(remark.id); setEditingRemarkContent(remark.content); }}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                onClick={() => handleDeleteRemark(remark.id)}
                                disabled={isDeletingRemark === remark.id}
                              >
                                {isDeletingRemark === remark.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap pr-16">{remark.content}</p>
                            <p className="text-xs text-slate-400 mt-3">
                              {format(new Date(remark.createdAt), "MMM d, yyyy HH:mm")} • Added by {remark.createdBy}
                              {new Date(remark.updatedAt).getTime() - new Date(remark.createdAt).getTime() > 1000 && " (Edited)"}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                    {(user.remarks?.length ?? 0) === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No remarks yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Joining Date Dialog */}
      <Dialog open={isEditJoiningDateOpen} onOpenChange={setIsEditJoiningDateOpen}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">Edit Joining Date</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Set a manual joining date for this user. This overrides the default profile completion date.
            </DialogDescription>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <Label htmlFor="joiningDate" className="text-xs font-semibold text-slate-600 mb-1.5 block">Joining Date</Label>
              <Input
                id="joiningDate"
                type="date"
                value={newJoiningDate}
                onChange={(e) => setNewJoiningDate(e.target.value)}
                className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
            <Button variant="ghost" onClick={() => setIsEditJoiningDateOpen(false)} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer">Cancel</Button>
            <Button onClick={handleUpdateJoiningDate} disabled={isUpdatingJoiningDate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer">
              {isUpdatingJoiningDate && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Save Date
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Email Dialog */}
      <Dialog open={isEditEmailOpen} onOpenChange={setIsEditEmailOpen}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
          <form onSubmit={handleUpdateEmail}>
            <div className="px-6 py-5 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                Change Email Address
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Update the login and notification email for this user. This updates both authentication and profile records.
              </DialogDescription>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Current Email</Label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
                  {user.email}
                </div>
              </div>
              <div>
                <Label htmlFor="newEmailInput" className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  New Email Address
                </Label>
                <Input
                  id="newEmailInput"
                  type="email"
                  placeholder="e.g. anowar@mirror.std"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  The user will immediately use this new email to sign in with their existing password.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditEmailOpen(false)}
                disabled={isUpdatingEmail}
                className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingEmail || !newEmail.trim() || newEmail.trim().toLowerCase() === user.email.toLowerCase()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer"
              >
                {isUpdatingEmail && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Save Email
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grant Selfie Recapture Permission Dialog */}
      <Dialog open={isGrantSelfieOpen} onOpenChange={setIsGrantSelfieOpen}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleToggleSelfiePermission(true);
            }}
          >
            <div className="px-6 py-5 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                Authorize Selfie Recapture
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Grant permission for this student to recapture their security selfie. A proper reason is required by security policy.
              </DialogDescription>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label htmlFor="selfieReasonInput" className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Proper Reason for Giving Permission *
                </Label>
                <Textarea
                  id="selfieReasonInput"
                  rows={3}
                  placeholder="e.g. Previous photo is blurry / Resident changed physical appearance / Face obscured in previous capture"
                  value={selfiePermissionReason}
                  onChange={(e) => setSelfiePermissionReason(e.target.value)}
                  className="border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  This reason will be logged in audit trails and displayed to the student on their portal.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsGrantSelfieOpen(false)}
                disabled={isUpdatingSelfiePermission}
                className="text-slate-600 rounded-lg h-9 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingSelfiePermission || !selfiePermissionReason.trim() || selfiePermissionReason.trim().length < 3}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs cursor-pointer shadow-sm"
              >
                {isUpdatingSelfiePermission && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Grant Recapture Permission
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* In-Tab Image & Document Preview Modal */}
      <ImagePreviewModal
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        title={previewImage?.title || ""}
        subtitle={previewImage?.subtitle}
        src={previewImage?.src}
        status={previewImage?.status}
        fileName={previewImage?.fileName}
      />
    </div>
  );
}
