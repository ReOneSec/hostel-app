"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-auth";
import { compressImageClientSide } from "@/lib/image-compression";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Camera,
  FileCheck2,
  ExternalLink,
  Info,
  Building,
  HelpCircle,
  ScrollText,
  BookOpen,
  ArrowRight,
  Plus,
  Lock,
  Unlock,
  MapPin,
} from "lucide-react";

export interface DocumentItem {
  id: string;
  documentType: "AADHAAR" | "VOTER_CARD" | "PASSPORT" | "DRIVING_LICENCE" | "PAN_CARD" | string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "VERIFIED" | string;
  rejectionReason?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

const DOC_TYPE_CONFIG: Record<
  string,
  { label: string; description: string; recommended?: boolean }
> = {
  AADHAAR: {
    label: "Aadhaar Card",
    description: "UIDAI issued 12-digit government identification (front & back)",
    recommended: true,
  },
  VOTER_CARD: {
    label: "Voter ID Card",
    description: "Election Commission of India photo identity card",
  },
  PASSPORT: {
    label: "Passport",
    description: "Official Indian passport (identity & address pages)",
  },
  DRIVING_LICENCE: {
    label: "Driving Licence",
    description: "State transport authority issued licence card",
  },
  PAN_CARD: {
    label: "PAN Card",
    description: "Income Tax Department permanent account number card",
  },
};

export default function StudentDocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"id_proofs" | "hostel_forms" | "selfie">("id_proofs");

  // Upload dialog & form state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview document modal
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Delete document modal
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Hostel Rules guideline modal
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [rulesType, setRulesType] = useState<"conduct" | "mess" | "antiragging">("conduct");

  // PDF generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Locked selfie recapture notice modal
  const [isLockedNoticeOpen, setIsLockedNoticeOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [docsRes, userRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/users/me"),
      ]);

      if (docsRes.ok) {
        const docsJson = await docsRes.json();
        setDocuments(docsJson.data || []);
      }

      if (userRes.ok) {
        const userJson = await userRes.json();
        setUserData(userJson.data || null);
        // Fallback to documents in user payload if docsRes had no items
        if (!docsRes.ok && userJson.data?.documents) {
          setDocuments(userJson.data.documents || []);
        }
      }
    } catch (err: any) {
      console.error("Failed to load documents data:", err);
      toast.error("Failed to load documents data. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileSelection(file: File) {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelection(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  }

  function resetUploadForm() {
    setSelectedType("");
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) {
      toast.error("Please select a document type");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select an image file to upload");
      return;
    }

    setIsUploading(true);
    try {
      toast.info("Optimizing document image...");
      const compressed = await compressImageClientSide(selectedFile);

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("documentType", selectedType);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload document");
      }

      toast.success(`${DOC_TYPE_CONFIG[selectedType]?.label || selectedType} uploaded successfully`);
      setIsUploadModalOpen(false);
      resetUploadForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteDocument() {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${docToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete document");
      }

      toast.success("Document removed successfully");
      setDocToDelete(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownloadAdmissionPDF() {
    if (!userData) {
      toast.error("User profile data not loaded yet.");
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const { generateAdmissionFormPDF } = await import("@/lib/pdf-generator");
      await generateAdmissionFormPDF(userData);
      toast.success("Admission Form generated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate admission form PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }

  function handleReupload(docType: string) {
    setSelectedType(docType);
    setSelectedFile(null);
    setFilePreview(null);
    setIsUploadModalOpen(true);
  }

  // Verification counts & status metrics
  const approvedDocs = documents.filter(
    (d) => d.status === "APPROVED" || d.status === "VERIFIED"
  );
  const pendingDocs = documents.filter((d) => d.status === "PENDING");
  const rejectedDocs = documents.filter((d) => d.status === "REJECTED");
  const currentSelfie = userData?.selfies?.find((s: any) => s.isCurrent) || userData?.selfies?.[0];

  // Overall verification badge status
  let overallStatusBadge = {
    label: "No Documents Uploaded",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: FileText,
  };

  if (rejectedDocs.length > 0) {
    overallStatusBadge = {
      label: "Action Required (Rejected Document)",
      color: "bg-red-50 text-red-700 border-red-200",
      icon: AlertTriangle,
    };
  } else if (approvedDocs.length > 0 && pendingDocs.length === 0) {
    overallStatusBadge = {
      label: "Fully Verified",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: ShieldCheck,
    };
  } else if (pendingDocs.length > 0 || approvedDocs.length > 0) {
    overallStatusBadge = {
      label: "Verification In Progress",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Clock,
    };
  }

  // Filtered documents list
  const filteredDocuments = documents.filter((doc) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "APPROVED") return doc.status === "APPROVED" || doc.status === "VERIFIED";
    return doc.status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* ─── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Documents & Verification
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${overallStatusBadge.color}`}
            >
              <overallStatusBadge.icon className="w-3.5 h-3.5" />
              {overallStatusBadge.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your government ID proofs, track verification status, and download official hostel documents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => {
              resetUploadForm();
              setIsUploadModalOpen(true);
            }}
            className="h-9 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Upload Document
          </Button>

          <Button
            variant="outline"
            onClick={fetchData}
            disabled={isLoading}
            className="h-9 w-9 p-0 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
            title="Refresh documents"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ─── SUMMARY STATS CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Verification Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ID Verification
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {approvedDocs.length > 0 ? "Verified" : pendingDocs.length > 0 ? "Under Review" : "Incomplete"}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {approvedDocs.length} approved • {pendingDocs.length} pending
            </p>
          </div>
        </div>

        {/* Uploaded Documents */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Uploaded Proofs
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {documents.length} / 5 <span className="text-xs font-normal text-slate-400">types</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {rejectedDocs.length > 0 ? (
                <span className="text-red-600 font-semibold">{rejectedDocs.length} rejected action needed</span>
              ) : (
                "Valid government IDs"
              )}
            </p>
          </div>
        </div>

        {/* Security Selfie Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Identity Photo
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
              <Camera className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-xl font-bold text-slate-900">
                {currentSelfie ? "Photo Active" : "Missing"}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentSelfie ? "Digital face verified" : "Please capture photo"}
              </p>
            </div>
            {currentSelfie && (
              <button
                type="button"
                onClick={() => setPreviewDoc({
                  id: currentSelfie.id,
                  documentType: "Verified Selfie Photo",
                  fileName: "selfie.jpg",
                  fileUrl: currentSelfie.fileUrl,
                  fileSize: 0,
                  uploadedAt: currentSelfie.capturedAt,
                  status: "VERIFIED"
                })}
                className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
                title="Click to preview photo within this tab"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentSelfie.fileUrl}
                  alt="Selfie thumbnail"
                  className="w-full h-full object-cover"
                />
              </button>
            )}
          </div>
        </div>

        {/* Admission Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Admission Form
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-xl font-bold text-slate-900">Official PDF</div>
              <p className="text-xs text-slate-500 mt-0.5">Registration record</p>
            </div>
            <Button
              onClick={handleDownloadAdmissionPDF}
              disabled={isGeneratingPDF}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ─── REJECTION ALERT BANNER (IF ANY) ─────────────────────────────────── */}
      {rejectedDocs.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900">
                Action Required: {rejectedDocs.length} document{rejectedDocs.length > 1 ? "s were" : " was"} rejected
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                The manager or administrator requested a clear re-upload. Check the feedback below and submit an updated copy.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleReupload(rejectedDocs[0].documentType)}
            className="h-8 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs cursor-pointer shrink-0"
          >
            Re-upload Now
          </Button>
        </div>
      )}

      {/* ─── NAVIGATION TABS ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px">
          <button
            onClick={() => setActiveTab("id_proofs")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "id_proofs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Government ID Proofs
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
              {documents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("hostel_forms")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "hostel_forms"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ScrollText className="w-4 h-4" />
            Hostel Forms & Undertakings
          </button>

          <button
            onClick={() => setActiveTab("selfie")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "selfie"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Camera className="w-4 h-4" />
            Security Photo (Selfie)
          </button>
        </nav>
      </div>

      {/* ─── TAB 1: GOVERNMENT ID PROOFS ─────────────────────────────────────── */}
      {activeTab === "id_proofs" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(["ALL", "APPROVED", "PENDING", "REJECTED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                    statusFilter === status
                      ? "bg-slate-900 text-white shadow-xs font-semibold"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {status === "ALL" && "All Documents"}
                  {status === "APPROVED" && "Approved"}
                  {status === "PENDING" && "Pending Review"}
                  {status === "REJECTED" && "Rejected"}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400">
              Showing {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-1/2" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-24 bg-slate-100 rounded-lg" />
                  <div className="h-8 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {statusFilter === "ALL" ? "No documents uploaded yet" : `No ${statusFilter.toLowerCase()} documents found`}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Upload your official identification proof (Aadhaar, Voter ID, Passport, Driving Licence, or PAN Card) to complete your hostel registration.
              </p>
              <Button
                onClick={() => {
                  resetUploadForm();
                  setIsUploadModalOpen(true);
                }}
                className="mt-4 h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload New Document
              </Button>
            </div>
          ) : (
            /* Documents Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {filteredDocuments.map((doc) => {
                const config = DOC_TYPE_CONFIG[doc.documentType] || {
                  label: doc.documentType.replace(/_/g, " "),
                  description: "Government issued identity document",
                };

                const isApproved = doc.status === "APPROVED" || doc.status === "VERIFIED";
                const isPending = doc.status === "PENDING";
                const isRejected = doc.status === "REJECTED";

                return (
                  <div
                    key={doc.id}
                    className={`bg-white rounded-xl border transition-all duration-200 shadow-sm flex flex-col justify-between overflow-hidden group ${
                      isRejected
                        ? "border-red-200 hover:border-red-300"
                        : isApproved
                        ? "border-emerald-200 hover:border-emerald-300"
                        : "border-slate-200 hover:border-blue-200"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isApproved
                                ? "bg-emerald-50 text-emerald-600"
                                : isRejected
                                ? "bg-red-50 text-red-600"
                                : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {config.label}
                            </h4>
                            <p className="text-xs text-slate-400 truncate max-w-[170px]" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200">
                              <Clock className="w-3 h-3" /> Under Review
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider bg-red-50 text-red-700 border-red-200">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body / Preview Thumbnail */}
                      <div className="p-4 space-y-3">
                        {/* File preview container */}
                        <div
                          onClick={() => setPreviewDoc(doc)}
                          className="relative h-32 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden cursor-pointer flex items-center justify-center group/preview"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.fileUrl}
                            alt={doc.fileName}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/preview:scale-105"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium">
                            <Eye className="w-4 h-4" />
                            Click to Preview
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>Uploaded {format(new Date(doc.uploadedAt), "dd MMM yyyy")}</span>
                          <span>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : "Document"}</span>
                        </div>

                        {/* Rejection notice box if rejected */}
                        {isRejected && (
                          <div className="bg-red-50/80 rounded-lg p-3 border border-red-200 text-xs text-red-800 space-y-1">
                            <div className="font-semibold flex items-center gap-1.5 text-red-900">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              Rejection Feedback:
                            </div>
                            <p className="text-red-700 leading-relaxed">
                              {doc.rejectionReason || "Image was unclear or invalid. Please re-upload a clear document."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewDoc(doc)}
                          className="h-8 text-xs text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>

                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.fileName}
                          className="inline-flex items-center justify-center h-8 px-2.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Open or Download file"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Download
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isRejected && (
                          <Button
                            size="sm"
                            onClick={() => handleReupload(doc.documentType)}
                            className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            Re-upload
                          </Button>
                        )}

                        {!isApproved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDocToDelete(doc)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Document Requirements Guide Box */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mt-6">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-600" />
              Document Upload Guidelines & Requirements
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="space-y-1">
                <span className="font-semibold text-slate-800">Clear & Legible</span>
                <p>Ensure all text, numbers, and dates on your photo ID card are clearly readable with no glare or blur.</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-slate-800">Government Valid</span>
                <p>Upload genuine government cards. Both front and back should be included where address details appear on reverse.</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-slate-800">File Formats</span>
                <p>Accepted file formats include JPG, PNG, and WebP under 5MB. Images are automatically optimized before storage.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: HOSTEL FORMS & UNDERTAKINGS ───────────────────────────────── */}
      {activeTab === "hostel_forms" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Admission Form Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between group hover:border-blue-200 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Mirror Hostels Admission & Registration Form
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Your formal stamped registration form generated with your personal details, parent contacts, hostel assignment, room number, digital photo, and cryptographic verification QR code.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    A4 Official Format
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                    Verified Digital Seal
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">PDF Generator Ready</span>
                <Button
                  onClick={handleDownloadAdmissionPDF}
                  disabled={isGeneratingPDF}
                  className="h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Download Admission PDF
                </Button>
              </div>
            </div>

            {/* Hostel Code of Conduct Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between group hover:border-purple-200 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <ScrollText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  Hostel Rules & Code of Conduct
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Rules and regulations regarding gate closing times, quiet hours, visitor entry policies, room cleanliness, electrical appliance safety, and student discipline guidelines.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    Gate Curfew: 10:00 PM
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                    Quiet Hours: 11 PM - 6 AM
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Policy Document</span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRulesType("conduct");
                    setIsRulesModalOpen(true);
                  }}
                  className="h-9 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  View Rules
                </Button>
              </div>
            </div>

            {/* Mess Dining Regulations Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between group hover:border-amber-200 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  Mess Regulations & Leave Policy
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Detailed guidelines covering standard meal timings, meal turn off / leave rebates, guest meal charges, kitchen hygiene, and dining hall etiquette.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    3 Meals Daily
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                    Rebate with Prior Notice
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Dining Guidelines</span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRulesType("mess");
                    setIsRulesModalOpen(true);
                  }}
                  className="h-9 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  View Mess Rules
                </Button>
              </div>
            </div>

            {/* Anti-Ragging Undertaking Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between group hover:border-emerald-200 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Anti-Ragging Undertaking & Compliance
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Statutory anti-ragging declaration in compliance with UGC regulations. Mirror Hostels maintains strict zero tolerance against any physical or psychological harassment.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                    Zero Tolerance Policy
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    24/7 Helpline Active
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Compliance Doc</span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRulesType("antiragging");
                    setIsRulesModalOpen(true);
                  }}
                  className="h-9 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  View Undertaking
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SECURITY SELFIE PHOTO ────────────────────────────────────── */}
      {activeTab === "selfie" && (() => {
        const isEligibleToRecapture = Boolean(
          userData?.canRecaptureSelfie || userData?.needsSelfieUpdate || !currentSelfie
        );

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Security Verification Selfie</h3>
                  {userData?.canRecaptureSelfie ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                      <Unlock className="w-3 h-3 text-amber-600" /> Recapture Allowed
                    </span>
                  ) : currentSelfie ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified & Locked
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official face photo used for hostel security gate access and mess verification.
                </p>
              </div>

              {isEligibleToRecapture ? (
                <Link href="/student/upload-selfie">
                  <Button
                    size="sm"
                    className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    {currentSelfie ? "Recapture Selfie" : "Capture Photo"}
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLockedNoticeOpen(true)}
                  className="h-8 text-xs font-medium border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  title="Recapture locked"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  Recapture Locked
                </Button>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
              {currentSelfie ? (
                <div
                  onClick={() => setPreviewDoc({
                    id: currentSelfie.id,
                    documentType: "Verified Selfie Photo",
                    fileName: "selfie.jpg",
                    fileUrl: currentSelfie.fileUrl,
                    fileSize: 0,
                    uploadedAt: currentSelfie.capturedAt,
                    status: "VERIFIED"
                  })}
                  className="w-48 h-48 rounded-xl overflow-hidden border-2 border-emerald-500/30 shadow-md relative group shrink-0 cursor-pointer"
                  title="Click to view full photo within this tab"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentSelfie.fileUrl}
                    alt="Verified Profile Photo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/95 text-slate-900 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> View Photo
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] py-1 px-2 rounded font-medium text-center flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Face Photo
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 shrink-0 text-slate-400">
                  <Camera className="w-10 h-10 mb-2" />
                  <span className="text-xs font-medium">No photo uploaded</span>
                </div>
              )}

              <div className="space-y-3 text-xs text-slate-600 flex-1 w-full">
                <div>
                  <span className="font-semibold text-slate-900 block">Security Verification</span>
                  <p className="text-slate-500 mt-0.5">
                    {currentSelfie
                      ? "Your selfie photo has been captured and linked to your digital admission record."
                      : "You must capture a security selfie to complete your hostel entry verification."}
                  </p>
                </div>

                {/* Admin Recapture Permission Banner if Granted */}
                {userData?.canRecaptureSelfie && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-xs text-amber-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Unlock className="w-3.5 h-3.5 text-amber-600" />
                      Admin Permission Granted for Recapture:
                    </div>
                    <p className="text-amber-800">
                      &ldquo;{userData.selfieRecaptureReason}&rdquo;
                    </p>
                    {userData.selfiePermissionGrantedAt && (
                      <p className="text-[10px] text-amber-600">
                        Authorized on {format(new Date(userData.selfiePermissionGrantedAt), "dd MMM yyyy, hh:mm a")}
                      </p>
                    )}
                  </div>
                )}

                {/* Recapture Locked Notice if not eligible */}
                {!isEligibleToRecapture && currentSelfie && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-slate-800">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      Recapture Locked by Policy
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      You are not eligible to recapture your selfie until an administrator grants permission with an authorized reason.
                    </p>
                  </div>
                )}

                {/* Timestamp & Geolocation Coordinates with Google Maps Link */}
                {currentSelfie?.capturedAt && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Captured On:</span>
                      <span className="font-medium text-slate-800">
                        {format(new Date(currentSelfie.capturedAt), "dd MMM yyyy, hh:mm a")}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Coordinates:</span>
                        <span className="font-mono text-slate-900 font-semibold text-[11px]">
                          {currentSelfie.latitude != null && currentSelfie.longitude != null
                            ? `${Number(currentSelfie.latitude).toFixed(6)}, ${Number(currentSelfie.longitude).toFixed(6)}`
                            : "Location not recorded"}
                        </span>
                      </div>

                      {currentSelfie.latitude != null && currentSelfie.longitude != null && (
                        <a
                          href={`https://www.google.com/maps?q=${currentSelfie.latitude},${currentSelfie.longitude}`}
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
                )}

                <div className="pt-2">
                  {isEligibleToRecapture ? (
                    <Link href="/student/upload-selfie">
                      <Button className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer w-full sm:w-auto">
                        <Camera className="w-3.5 h-3.5 mr-1.5" />
                        {currentSelfie ? "Recapture Selfie" : "Capture Security Photo"}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => setIsLockedNoticeOpen(true)}
                      variant="outline"
                      className="h-9 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer w-full sm:w-auto"
                    >
                      <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      Recapture Locked (Requires Admin Permission)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── UPLOAD DOCUMENT MODAL ───────────────────────────────────────────── */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              Upload Government ID Proof
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select your document type and upload a high-resolution, clear photo of the identity card.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {/* Document Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Document Type *</label>
              <Select value={selectedType} onValueChange={(val) => setSelectedType(val ?? "")} required>
                <SelectTrigger className="h-9 text-xs border-slate-200 rounded-lg bg-white">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {Object.entries(DOC_TYPE_CONFIG).map(([value, cfg]) => {
                    const alreadyUploaded = documents.some((d) => d.documentType === value);
                    return (
                      <SelectItem key={value} value={value} className="text-xs">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{cfg.label}</span>
                          {alreadyUploaded && (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                              Uploaded
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-[11px] text-slate-500">
                  {DOC_TYPE_CONFIG[selectedType]?.description}
                </p>
              )}
            </div>

            {/* Drag & Drop File Zone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Document Image *</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? "border-blue-500 bg-blue-50/50"
                    : selectedFile
                    ? "border-emerald-300 bg-emerald-50/20"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                {filePreview ? (
                  <div className="space-y-2">
                    <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden border border-slate-200 shadow-xs relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={filePreview}
                        alt="Selected Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{selectedFile?.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB • Click to change` : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Drag and drop your file here, or <span className="text-blue-600">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports JPG, PNG, WebP (Max 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadModalOpen(false)}
                className="h-9 text-xs border-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !selectedType || !selectedFile}
                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload & Submit
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── PREVIEW DOCUMENT MODAL ─────────────────────────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              {previewDoc ? DOC_TYPE_CONFIG[previewDoc.documentType]?.label || previewDoc.documentType : "Preview"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {previewDoc?.fileName} • Uploaded on{" "}
              {previewDoc ? format(new Date(previewDoc.uploadedAt), "dd MMMM yyyy") : ""}
            </DialogDescription>
          </DialogHeader>

          {previewDoc && (
            <div className="space-y-4 pt-2">
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.fileName}
                  className="max-h-[55vh] w-auto object-contain rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Status:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                      previewDoc.status === "APPROVED" || previewDoc.status === "VERIFIED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : previewDoc.status === "REJECTED"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {previewDoc.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center h-8 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open in New Tab
                  </a>
                  <a
                    href={previewDoc.fileUrl}
                    download={previewDoc.fileName}
                    className="inline-flex items-center h-8 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION MODAL ───────────────────────────────────────── */}
      <Dialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              Remove Document
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to remove{" "}
              <strong className="text-slate-800">
                {docToDelete ? DOC_TYPE_CONFIG[docToDelete.documentType]?.label || docToDelete.documentType : ""}
              </strong>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDocToDelete(null)}
              className="h-9 text-xs border-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteDocument}
              disabled={isDeleting}
              className="h-9 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
              Yes, Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── HOSTEL RULES & UNDERTAKINGS MODAL ───────────────────────────────── */}
      <Dialog open={isRulesModalOpen} onOpenChange={setIsRulesModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              {rulesType === "conduct" && "Hostel Rules & Code of Conduct"}
              {rulesType === "mess" && "Mess Regulations & Meal Timings"}
              {rulesType === "antiragging" && "Statutory Anti-Ragging Undertaking"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Official policies applicable to all enrolled residents of Mirror Hostels.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto pr-2 space-y-4 text-xs text-slate-700 leading-relaxed py-2 flex-1">
            {rulesType === "conduct" && (
              <>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">1. Gate Timings & Curfew</h5>
                  <p>The hostel main gates close promptly at 10:00 PM. Residents returning after curfew must produce prior written permission or emergency approval from the Hostel Manager.</p>
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">2. Quiet Hours & Study Environment</h5>
                  <p>Quiet hours are observed between 11:00 PM and 6:00 AM daily. Playing loud music or causing disturbance in corridors and common areas during quiet hours is strictly prohibited.</p>
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">3. Room Cleanliness & Property Care</h5>
                  <p>Residents are responsible for the furniture and fixtures provided in their rooms. Any damage to hostel property will be recovered from the security deposit or billed directly.</p>
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">4. Visitor Policies</h5>
                  <p>Day visitors and parents are permitted in the designated visitor lounge between 9:00 AM and 7:00 PM. Overnight guests are strictly not allowed in student rooms without prior written approval.</p>
                </div>
              </>
            )}

            {rulesType === "mess" && (
              <>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">1. Meal Timings</h5>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Breakfast: 7:30 AM – 9:30 AM</li>
                    <li>Lunch: 12:30 PM – 2:30 PM</li>
                    <li>Dinner: 7:30 PM – 9:45 PM</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">2. Meal Turn-Off & Rebate Policy</h5>
                  <p>Residents going on leave can turn off meals via the online portal with a minimum 12-hour prior notice. Rebates are calculated and adjusted against subsequent monthly bills automatically.</p>
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">3. Food Wastage & Kitchen Cleanliness</h5>
                  <p>Residents must be mindful of food wastage. Meals must be consumed within the dining hall and food may not be carried to individual rooms except in cases of medically certified illness.</p>
                </div>
              </>
            )}

            {rulesType === "antiragging" && (
              <>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">1. Strict Anti-Ragging Commitment</h5>
                  <p>In accordance with the statutory directives of the Supreme Court of India and UGC guidelines, ragging in any form (verbal, physical, psychological) is strictly prohibited on hostel premises.</p>
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">2. Disciplinary Penalties</h5>
                  <p>Any student found participating in, abetting, or propagating ragging shall be immediately suspended, reported to law enforcement authorities, and subject to immediate hostel expulsion.</p>
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-sm">3. Emergency Help Desk</h5>
                  <p>If you experience or witness any misconduct, report immediately to the 24/7 Hostel Warden or submit a confidential grievance through the administrative portal.</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              onClick={() => setIsRulesModalOpen(false)}
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
            >
              Close Guidelines
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── LOCKED SELFIE RECAPTURE POLICY MODAL ────────────────────────────── */}
      <Dialog open={isLockedNoticeOpen} onOpenChange={setIsLockedNoticeOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              Selfie Recapture Locked
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Security Verification Policy Notice
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-600">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
              <p className="font-semibold text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Administrator Permission Required
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Residents are not eligible to recapture their security selfie photo until an administrator or hostel manager grants permission with a documented reason.
              </p>
            </div>

            <div className="space-y-1.5 text-slate-600">
              <p className="font-semibold text-slate-800">When is recapture permitted?</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>If your initial photo was blurry or obscured</li>
                <li>Significant physical appearance change</li>
                <li>Administrative identity re-verification request</li>
              </ul>
            </div>

            <p className="text-[11px] text-slate-500 pt-1">
              Please contact your Hostel Manager or submit a request to hostel administration to unlock selfie recapture.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={() => setIsLockedNoticeOpen(false)}
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
