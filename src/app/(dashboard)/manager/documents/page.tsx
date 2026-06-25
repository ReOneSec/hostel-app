"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  FileText, 
  Loader2, 
  Search, 
  XCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function DocumentVerificationPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog state
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    setIsLoading(true);
    try {
      // For now, fetch ALL pending documents. 
      // If needed later, we can add ?hostelId=X for specific managers.
      const res = await fetch("/api/documents?status=PENDING");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const { data } = await res.json();
      setDocuments(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(documentId: string, status: "APPROVED" | "REJECTED", reason?: string) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success(`Document marked as ${status}`);
      
      // Remove the document from the list
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Close dialog if open
      if (isRejectDialogOpen) {
        setIsRejectDialogOpen(false);
        setRejectReason("");
        setSelectedDoc(null);
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${status.toLowerCase()} document`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredDocs = documents.filter(doc => {
    const name = doc.user?.studentProfile?.fullName || doc.user?.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           doc.documentType.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Verification</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review and approve pending student KYC documents.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Pending Queue</h3>
              <p className="text-xs text-slate-400">{documents.length} document{documents.length !== 1 && "s"} waiting for verification</p>
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by student or type..."
              className="pl-9 h-9 border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-600" />
              <p className="text-sm">Loading documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">All Caught Up!</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                There are no pending documents waiting for verification in your queue.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5 bg-slate-50/50">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group">
                  <div className="aspect-video w-full bg-slate-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={doc.fileUrl} 
                      alt={doc.documentType}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center justify-center bg-white text-slate-900 rounded-lg h-8 px-3 text-xs font-semibold shadow-sm hover:bg-slate-50 transition-colors gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Full Screen
                      </a>
                    </div>
                  </div>
                  <div className="p-4 space-y-4 flex-1 flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-slate-900 truncate pr-2 text-sm">
                          {doc.user?.studentProfile?.fullName || doc.user?.username || "Unknown Student"}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200 shrink-0">
                          {doc.documentType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Uploaded {format(new Date(doc.uploadedAt), "MMM d, yy 'at' HH:mm")}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 mt-auto">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-9 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        disabled={isSubmitting}
                        onClick={() => {
                          setSelectedDoc(doc);
                          setIsRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Reject
                      </Button>
                      <Button 
                        className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        disabled={isSubmitting}
                        onClick={() => {
                          if(confirm("Approve this document?")) {
                            handleVerify(doc.id, "APPROVED");
                          }
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">Reject Document</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Please provide a reason for rejecting this document. The student will be notified and asked to re-upload.
            </DialogDescription>
          </div>
          
          <div className="px-6 py-5">
            <Textarea
              placeholder="e.g. Image is too blurry, or wrong document type uploaded..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px] border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>
          
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
            <Button type="button" variant="ghost" onClick={() => setIsRejectDialogOpen(false)} disabled={isSubmitting} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto"
              disabled={!rejectReason.trim() || isSubmitting}
              onClick={() => handleVerify(selectedDoc.id, "REJECTED", rejectReason)}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

