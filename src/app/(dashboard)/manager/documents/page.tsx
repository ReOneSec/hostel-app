"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
  ExternalLink
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Verification</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve pending student KYC documents.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Pending Queue</CardTitle>
              <CardDescription>
                {documents.length} document{documents.length !== 1 && "s"} waiting for verification
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name or document type..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p>Loading documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground max-w-sm">
                There are no pending documents waiting for verification in your queue.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 md:p-6 bg-muted/30">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
                  <div className="aspect-video w-full bg-muted relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={doc.fileUrl} 
                      alt={doc.documentType}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:ring-3 focus-visible:ring-ring/50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-7 px-2.5 gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Full Screen
                      </a>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold truncate pr-2">
                          {doc.user?.studentProfile?.fullName || doc.user?.username || "Unknown Student"}
                        </h4>
                        <Badge variant="outline" className="shrink-0">{doc.documentType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Uploaded {format(new Date(doc.uploadedAt), "MMM d, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <Button 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" 
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => {
                          if(confirm("Approve this document?")) {
                            handleVerify(doc.id, "APPROVED");
                          }
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                        disabled={isSubmitting}
                        onClick={() => {
                          setSelectedDoc(doc);
                          setIsRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. The student will be notified and asked to re-upload.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="e.g. Image is too blurry, or wrong document type uploaded..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={!rejectReason.trim() || isSubmitting}
              onClick={() => handleVerify(selectedDoc.id, "REJECTED", rejectReason)}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
