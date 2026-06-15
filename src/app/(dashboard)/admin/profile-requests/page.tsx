"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ProfileRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const res = await fetch("/api/admin/profile-requests");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRequests(json.data);
    } catch (error) {
      toast.error("Failed to load profile requests");
    } finally {
      setIsLoading(false);
    }
  }

  const handleProcess = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/profile-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success(`Request ${action.toLowerCase()}d successfully`);
      setSelectedRequest(null);
      setRejectionReason("");
      setIsRejecting(false);
      fetchRequests(); // refresh list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.user.email.toLowerCase().includes(search.toLowerCase()) ||
    req.user.studentProfile?.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve student profile edits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name/email..."
              className="pl-8 w-full sm:w-[250px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Requested On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{req.user.studentProfile?.fullName || "N/A"}</span>
                      <span className="text-xs text-muted-foreground">{req.user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(req.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={req.status === "PENDING" ? "secondary" : req.status === "APPROVED" ? "outline" : "destructive"}>
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {req.reviewer?.username || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === "PENDING" && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequest(null);
          setIsRejecting(false);
          setRejectionReason("");
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Profile Edit Request</DialogTitle>
            <DialogDescription>
              Review the requested changes from {selectedRequest?.user.studentProfile?.fullName} ({selectedRequest?.user.email}).
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="py-4">
              <div className="border rounded-md overflow-x-auto w-full">
                <Table className="min-w-full table-fixed">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[30%]">Field</TableHead>
                      <TableHead className="w-[35%]">Current Value</TableHead>
                      <TableHead className="w-[35%] bg-primary/5">Requested Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(selectedRequest.requestedChanges).map((key) => {
                      const oldVal = selectedRequest.user.studentProfile?.[key];
                      const newVal = selectedRequest.requestedChanges[key];
                      // Only show changed fields
                      if (oldVal === newVal) return null;
                      
                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium capitalize align-top break-words">{key.replace(/([A-Z])/g, ' $1').trim()}</TableCell>
                          <TableCell className="text-muted-foreground line-through decoration-destructive/50 align-top break-words">{oldVal || "N/A"}</TableCell>
                          <TableCell className="text-emerald-600 font-medium bg-primary/5 align-top break-words">{newVal || "N/A"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {isRejecting && (
                <div className="mt-4 space-y-2">
                  <Label>Rejection Reason</Label>
                  <Textarea 
                    value={rejectionReason} 
                    onChange={(e) => setRejectionReason(e.target.value)} 
                    placeholder="Briefly explain why these changes are denied..." 
                    className="border-destructive/50 focus-visible:ring-destructive"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setSelectedRequest(null)} disabled={isProcessing} className="w-full sm:w-auto">
              Cancel
            </Button>
            
            {isRejecting ? (
              <Button variant="destructive" onClick={() => handleProcess("REJECT")} disabled={isProcessing} className="w-full sm:w-auto">
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                Confirm Rejection
              </Button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="destructive" onClick={() => setIsRejecting(true)} disabled={isProcessing} className="flex-1 sm:flex-none">
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-none" onClick={() => handleProcess("APPROVE")} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Approve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
