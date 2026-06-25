"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Check, X, Loader2, Eye, Receipt, Calendar, CreditCard, User, Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; dot: string; className: string }> = {
    PENDING_REVIEW: { label: "Pending", dot: "bg-amber-500", className: "bg-amber-50 text-amber-800 border-amber-200" },
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

export default function PaymentVerificationPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");

  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [verifyStatus, setVerifyStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  async function fetchPayments() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/payments?status=${statusFilter === "ALL" ? "" : statusFilter}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPayments(json.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch payments");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenVerify(payment: any, status: "APPROVED" | "REJECTED") {
    setSelectedPayment(payment);
    setVerifyStatus(status);
    setRejectionReason("");
    setIsVerifyDialogOpen(true);
  }

  async function submitVerification() {
    if (!selectedPayment) return;
    if (verifyStatus === "REJECTED" && !rejectionReason.trim()) {
      return toast.error("Rejection reason is required");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: verifyStatus,
          rejectionReason: rejectionReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success(`Payment ${verifyStatus.toLowerCase()} successfully`);
      setIsVerifyDialogOpen(false);
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message || "Failed to verify payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Verification</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review student payments and match UTR numbers.</p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
            <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Filter by status">
                {statusFilter === "PENDING_REVIEW" ? "Pending Review" : 
                 statusFilter === "APPROVED" ? "Approved" : 
                 statusFilter === "REJECTED" ? "Rejected" : 
                 statusFilter === "ALL" ? "All Payments" : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ALL">All Payments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Submitted Payments</h3>
            <p className="text-xs text-slate-400">{payments.length} payment{payments.length !== 1 && "s"} found</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-400 mt-3">Loading payments…</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Receipt className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No payments found</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              No payments match the current filter. Try a different status.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[1.5fr_1.5fr_2fr_1fr_1fr_auto] px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bill Details</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Info</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</span>
              </div>
              {payments.map((payment) => (
                <div key={payment.id} className="grid grid-cols-[1.5fr_1.5fr_2fr_1fr_1fr_auto] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                  {/* Student */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(payment.user.studentProfile?.fullName || payment.user.username).substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {payment.user.studentProfile?.fullName || payment.user.username}
                    </span>
                  </div>

                  {/* Bill Details */}
                  <div>
                    <p className="text-sm font-medium text-slate-700">{payment.bill.hostel?.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(0, payment.bill.month - 1).toLocaleString("default", { month: "short" })} {payment.bill.year}
                    </p>
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-1">
                    {payment.utrNumber && (
                      <p className="text-xs flex items-center gap-1 text-slate-600">
                        <Landmark className="w-3 h-3 text-slate-400" />
                        UTR: <span className="font-mono font-medium">{payment.utrNumber}</span>
                      </p>
                    )}
                    <p className="text-xs text-slate-400">Paid: {format(new Date(payment.paymentDate), "MMM d, yyyy")}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {payment.categories?.map((cat: string) => (
                        <span key={cat} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 uppercase tracking-wider">
                          {cat.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <p className="text-sm font-bold text-green-700">
                    ₹{Number(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>

                  {/* Status */}
                  <div>
                    <PaymentStatusBadge status={payment.status} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {payment.proofFileUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                        onClick={() => window.open(payment.proofFileUrl!, "_blank", "noopener,noreferrer")}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Proof
                      </Button>
                    )}
                    {payment.status === "PENDING_REVIEW" && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                          onClick={() => handleOpenVerify(payment, "APPROVED")}
                        >
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                          onClick={() => handleOpenVerify(payment, "REJECTED")}
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
              {payments.map((payment) => (
                <div key={payment.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {(payment.user.studentProfile?.fullName || payment.user.username).substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{payment.user.studentProfile?.fullName || payment.user.username}</p>
                        <p className="text-xs text-slate-400">{payment.bill.hostel?.name}</p>
                      </div>
                    </div>
                    <PaymentStatusBadge status={payment.status} />
                  </div>

                  {/* Key-value rows */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Period</span>
                      <span className="text-xs font-medium text-slate-700">
                        {new Date(0, payment.bill.month - 1).toLocaleString("default", { month: "short" })} {payment.bill.year}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Amount</span>
                      <span className="text-sm font-bold text-green-700">
                        ₹{Number(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {payment.utrNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">UTR</span>
                        <span className="text-xs font-mono font-medium text-slate-700">{payment.utrNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Paid On</span>
                      <span className="text-xs text-slate-500">{format(new Date(payment.paymentDate), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {payment.status === "PENDING_REVIEW" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                        onClick={() => handleOpenVerify(payment, "APPROVED")}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                        onClick={() => handleOpenVerify(payment, "REJECTED")}
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
              {verifyStatus === "APPROVED" ? "Approve Payment" : "Reject Payment"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {verifyStatus === "APPROVED"
                ? "This will update the bill's paid balance and automatically mark it as PAID if fully settled."
                : "Please provide a reason so the student knows why their payment was rejected."}
            </DialogDescription>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-800">{selectedPayment?.user?.studentProfile?.fullName}</p>
              <div className="flex justify-between items-center mt-1.5">
                <p className="text-xs text-slate-400">Amount: <span className="font-bold text-green-700">₹{selectedPayment ? Number(selectedPayment.amount).toLocaleString("en-IN") : 0}</span></p>
                {selectedPayment?.utrNumber && <p className="text-xs text-slate-400 font-mono">UTR: {selectedPayment.utrNumber}</p>}
              </div>
            </div>

            {verifyStatus === "REJECTED" && (
              <div>
                <Label htmlFor="reason" className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Rejection Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., UTR number does not match bank records, amount is incorrect..."
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

