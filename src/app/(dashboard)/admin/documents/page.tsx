"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  FileText, Check, X, Loader2, Eye, Calendar, FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function DocumentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; dot: string; className: string }> = {
    PENDING: { label: "Pending", dot: "bg-amber-500", className: "bg-amber-50 text-amber-800 border-amber-200" },
    APPROVED: { label: "Approved", dot: "bg-green-500", className: "bg-green-50 text-green-800 border-green-200" },
    REJECTED: { label: "Rejected", dot: "bg-red-400", className: "bg-red-50 text-red-700 border-red-200" },
  };
  const c = config[status] || { label: status, dot: "bg-slate-400", className: "bg-slate-50 text-slate-500 border-slate-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export default function DocumentVerificationPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [verifyStatus, setVerifyStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  async function fetchDocuments() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/documents?status=${statusFilter === "ALL" ? "" : statusFilter}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDocuments(json.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenVerify(doc: any, status: "APPROVED" | "REJECTED") {
    setSelectedDocument(doc);
    setVerifyStatus(status);
    setRejectionReason("");
    setIsVerifyDialogOpen(true);
  }

  async function submitVerification() {
    if (!selectedDocument) return;
    if (verifyStatus === "REJECTED" && !rejectionReason.trim()) {
      return toast.error("Rejection reason is required");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${selectedDocument.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: verifyStatus,
          reason: rejectionReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success(`Document ${verifyStatus.toLowerCase()} successfully`);
      setIsVerifyDialogOpen(false);
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.message || "Failed to verify document");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Verification</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review and approve student KYC documents.</p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
            <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Filter by status">
                {statusFilter === "PENDING" ? "Pending Review" : 
                 statusFilter === "APPROVED" ? "Approved" : 
                 statusFilter === "REJECTED" ? "Rejected" : 
                 statusFilter === "ALL" ? "All Documents" : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ALL">All Documents</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Uploaded Documents</h3>
            <p className="text-xs text-slate-400">{documents.length} document{documents.length !== 1 && "s"} found</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-400 mt-3">Loading documents…</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No documents found</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              No documents match the current filter. Try a different status.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Type</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</span>
              </div>
              {documents.map((doc) => (
                <div key={doc.id} className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                  {/* Student */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(doc.user.studentProfile?.fullName || doc.user.username).substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {doc.user.studentProfile?.fullName || doc.user.username}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{doc.user.email}</p>
                    </div>
                  </div>

                  {/* Document Type */}
                  <div>
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {doc.documentType}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 ml-5">
                      {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  {/* Uploaded */}
                  <p className="text-sm text-slate-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                  </p>

                  {/* Status */}
                  <div>
                    <DocumentStatusBadge status={doc.status} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      onClick={() => window.open(doc.fileUrl, "_blank", "noopener,noreferrer")}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>

                    {doc.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                          onClick={() => handleOpenVerify(doc, "APPROVED")}
                        >
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                          onClick={() => handleOpenVerify(doc, "REJECTED")}
                        >
                          <X className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {(doc.user.studentProfile?.fullName || doc.user.username).substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{doc.user.studentProfile?.fullName || doc.user.username}</p>
                        <p className="text-xs text-slate-400 truncate">{doc.user.email}</p>
                      </div>
                    </div>
                    <DocumentStatusBadge status={doc.status} />
                  </div>

                  {/* Key-value rows */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Document</span>
                      <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        {doc.documentType}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Size</span>
                      <span className="text-xs text-slate-600">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Uploaded</span>
                      <span className="text-xs text-slate-500">{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs border-slate-200 text-slate-700 cursor-pointer"
                      onClick={() => window.open(doc.fileUrl, "_blank", "noopener,noreferrer")}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Document
                    </Button>
                  </div>
                  {doc.status === "PENDING" && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                        onClick={() => handleOpenVerify(doc, "APPROVED")}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                        onClick={() => handleOpenVerify(doc, "REJECTED")}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Verify Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">
              {verifyStatus === "APPROVED" ? "Approve Document" : "Reject Document"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {verifyStatus === "APPROVED"
                ? "This will mark the document as verified and compliant."
                : "Please provide a reason so the student can upload a corrected version."}
            </DialogDescription>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-800">{selectedDocument?.user?.studentProfile?.fullName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{selectedDocument?.documentType}</p>
            </div>

            {verifyStatus === "REJECTED" && (
              <div>
                <Label htmlFor="reason" className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Rejection Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Image is too blurry, wrong document type..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
            <Button variant="ghost" onClick={() => setIsVerifyDialogOpen(false)} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer">Cancel</Button>
            <Button
              onClick={submitVerification}
              disabled={isSubmitting || (verifyStatus === "REJECTED" && !rejectionReason.trim())}
              className={`rounded-lg h-9 text-sm cursor-pointer ${
                verifyStatus === "APPROVED"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

