"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Search, FileEdit } from "lucide-react";
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

function RequestStatusBadge({ status }: { status: string }) {
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review and approve student profile edits.</p>
        </div>
        <div className="w-full sm:w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name/email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-white border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileEdit className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Edit Requests</h3>
            <p className="text-xs text-slate-400">{filteredRequests.length} request{filteredRequests.length !== 1 && "s"} found</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-400 mt-3">Loading requests…</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <FileEdit className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No requests found</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              There are no pending profile edit requests at this time.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Requested On</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reviewer</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</span>
              </div>
              {filteredRequests.map((req) => (
                <div key={req.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                  {/* Student */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(req.user.studentProfile?.fullName || req.user.username || "N/A").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {req.user.studentProfile?.fullName || "N/A"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{req.user.email}</p>
                    </div>
                  </div>

                  {/* Requested On */}
                  <p className="text-sm text-slate-600">
                    {format(new Date(req.createdAt), "MMM d, yyyy")}
                  </p>

                  {/* Status */}
                  <div>
                    <RequestStatusBadge status={req.status} />
                  </div>

                  {/* Reviewer */}
                  <p className="text-sm text-slate-500">
                    {req.reviewer?.username || "-"}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-end">
                    {req.status === "PENDING" && (
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                        onClick={() => setSelectedRequest(req)}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-3">
              {filteredRequests.map((req) => (
                <div key={req.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {(req.user.studentProfile?.fullName || req.user.username || "N/A").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{req.user.studentProfile?.fullName || "N/A"}</p>
                        <p className="text-xs text-slate-400 truncate">{req.user.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Key-value rows */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Status</span>
                      <RequestStatusBadge status={req.status} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Requested</span>
                      <span className="text-xs text-slate-600">{format(new Date(req.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Reviewer</span>
                      <span className="text-xs text-slate-500">{req.reviewer?.username || "-"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status === "PENDING" && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                        onClick={() => setSelectedRequest(req)}
                      >
                        Review Request
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequest(null);
          setIsRejecting(false);
          setRejectionReason("");
        }
      }}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-3xl w-full p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">Review Profile Edit Request</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Review the requested changes from {selectedRequest?.user.studentProfile?.fullName} ({selectedRequest?.user.email}).
            </DialogDescription>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
            {selectedRequest && (
              <div className="space-y-5">
                {/* Changes Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="grid grid-cols-[1.5fr_2fr_2fr] px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Field</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Value</span>
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Requested Value</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {Object.keys(selectedRequest.requestedChanges).map((key) => {
                      const oldVal = selectedRequest.user.studentProfile?.[key];
                      const newVal = selectedRequest.requestedChanges[key];
                      // Only show changed fields
                      if (oldVal === newVal) return null;

                      return (
                        <div key={key} className="grid grid-cols-[1.5fr_2fr_2fr] px-4 py-3 items-start gap-4">
                          <span className="text-sm font-medium text-slate-800 capitalize break-words">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-sm text-slate-400 line-through decoration-red-300 break-words">
                            {oldVal || <span className="italic">N/A</span>}
                          </span>
                          <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-100 break-words inline-block w-fit">
                            {newVal || <span className="italic text-green-600/50">N/A</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isRejecting && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Rejection Reason <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Briefly explain why these changes are denied..."
                      className="border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2 bg-slate-50/50">
            <Button
              variant="ghost"
              onClick={() => setSelectedRequest(null)}
              disabled={isProcessing}
              className="text-slate-600 rounded-lg h-9 text-sm w-full sm:w-auto cursor-pointer"
            >
              Cancel
            </Button>

            {isRejecting ? (
              <Button
                onClick={() => handleProcess("REJECT")}
                disabled={isProcessing || !rejectionReason.trim()}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg h-9 text-sm w-full sm:w-auto cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <X className="w-3.5 h-3.5 mr-1.5" />}
                Confirm Rejection
              </Button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setIsRejecting(true)}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 rounded-lg h-9 text-sm cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
                <Button
                  onClick={() => handleProcess("APPROVE")}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white rounded-lg h-9 text-sm cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                  Approve
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

