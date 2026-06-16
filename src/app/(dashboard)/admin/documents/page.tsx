"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  FileText, Check, X, Loader2, Eye, File, ExternalLink, Calendar
} from "lucide-react";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Verification</h1>
          <p className="text-muted-foreground mt-1">Review and approve student KYC documents.</p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
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

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 && 's'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No documents found in this view.
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="font-medium">{doc.user.studentProfile?.fullName || doc.user.username}</div>
                          <div className="text-xs text-muted-foreground">{doc.user.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span>{doc.documentType}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.status === "PENDING" && <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>}
                          {doc.status === "APPROVED" && <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">Approved</Badge>}
                          {doc.status === "REJECTED" && <Badge variant="destructive">Rejected</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.open(doc.fileUrl, "_blank", "noopener,noreferrer")}
                            >
                              <Eye className="w-4 h-4 mr-2" /> View
                            </Button>
                            
                            {doc.status === "PENDING" && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                  onClick={() => handleOpenVerify(doc, "APPROVED")}
                                >
                                  <Check className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleOpenVerify(doc, "REJECTED")}
                                >
                                  <X className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyStatus === "APPROVED" ? "Approve Document" : "Reject Document"}
            </DialogTitle>
            <DialogDescription>
              {verifyStatus === "APPROVED" 
                ? "This will mark the document as verified and compliant."
                : "Please provide a reason so the student can upload a corrected version."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 border rounded bg-muted/30">
              <p className="font-medium text-sm">{selectedDocument?.user?.studentProfile?.fullName}</p>
              <p className="text-xs text-muted-foreground">{selectedDocument?.documentType}</p>
            </div>

            {verifyStatus === "REJECTED" && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason <span className="text-destructive">*</span></Label>
                <Textarea 
                  id="reason" 
                  placeholder="e.g., Image is too blurry, wrong document type..." 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsVerifyDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={verifyStatus === "APPROVED" ? "default" : "destructive"}
              onClick={submitVerification}
              disabled={isSubmitting || (verifyStatus === "REJECTED" && !rejectionReason.trim())}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
