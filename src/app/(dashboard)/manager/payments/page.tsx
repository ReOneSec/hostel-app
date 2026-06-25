"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Receipt, CheckCircle2, XCircle, Clock, Search, Calendar, User, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type PaymentData = {
  id: string;
  amount: string;
  paymentDate: string;
  status: string;
  transactionId: string | null;
  utrNumber: string | null;
  proofFileUrl: string | null;
  user: {
    username: string;
    studentProfile: { fullName: string } | null;
  };
  bill: {
    month: number;
    year: number;
    totalAmount: string;
    hostel: { name: string };
  };
};

export default function ManagerPaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  async function fetchPendingPayments() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/payments?status=PENDING_REVIEW");
      if (!res.ok) throw new Error("Failed to fetch payments");
      const { data } = await res.json();
      setPayments(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load payment queue");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(status: "APPROVED" | "REJECTED") {
    if (!selectedPayment) return;
    
    if (status === "REJECTED" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          rejectionReason: status === "REJECTED" ? rejectionReason : null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to verify payment");
      }

      toast.success(`Payment ${status.toLowerCase()} successfully`);
      setSelectedPayment(null);
      setRejectionReason("");
      fetchPendingPayments();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  const filteredPayments = payments.filter(p => 
    (p.user.studentProfile?.fullName || p.user.username).toLowerCase().includes(search.toLowerCase()) ||
    (p.utrNumber || p.transactionId || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Verification</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review and approve pending student payments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-4 h-4" />
            {payments.length} Pending
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Review Queue</h3>
              <p className="text-xs text-slate-400">Payments requiring your approval</p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by student or UTR..."
              className="pl-9 h-9 border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm text-slate-400">Loading payment queue...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">All caught up!</h3>
              <p className="text-xs text-slate-500">No pending payments require your review at this time.</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p className="text-sm font-semibold text-slate-700">No matches found</p>
              <p className="text-xs text-slate-500">Try adjusting your search terms.</p>
            </div>
          ) : (
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bill Month</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hostel</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount Paid</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference (UTR)</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</span>
              </div>
              
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                  <div className="flex items-center gap-3 pr-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {payment.user.studentProfile?.fullName || payment.user.username}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">
                        {new Date(payment.bill.year, payment.bill.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Bill: ₹{parseFloat(payment.bill.totalAmount).toFixed(0)}
                    </span>
                  </div>
                  
                  <span className="text-xs text-slate-600 truncate pr-2">{payment.bill.hostel.name}</span>
                  
                  <span className="text-sm font-bold text-emerald-600 text-right">₹{parseFloat(payment.amount).toFixed(2)}</span>
                  
                  <div className="pl-4">
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {payment.utrNumber || payment.transactionId || "N/A"}
                    </span>
                    <div className="text-xs text-slate-400 mt-1">
                      {format(new Date(payment.paymentDate), "MMM d, yyyy")}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setSelectedPayment(payment)}
                      size="sm"
                      className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl sm:max-w-[750px] p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-white">
            <DialogTitle className="text-base font-bold text-slate-900">Review Payment</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Verify the payment details against the uploaded screenshot.
            </DialogDescription>
          </div>

          {selectedPayment && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left Column: Details */}
                <div className="md:col-span-2 flex flex-col h-full space-y-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 flex-1">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Details</h4>
                    
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-slate-500">Student</span>
                      <span className="text-xs font-medium text-slate-900">{selectedPayment.user.studentProfile?.fullName || selectedPayment.user.username}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-slate-500">Bill Month</span>
                      <span className="text-xs font-medium text-slate-900">{new Date(selectedPayment.bill.year, selectedPayment.bill.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-slate-500">Bill Total</span>
                      <span className="text-xs font-medium text-slate-900">₹{parseFloat(selectedPayment.bill.totalAmount).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-slate-500">Payment Date</span>
                      <span className="text-xs font-medium text-slate-900">{format(new Date(selectedPayment.paymentDate), "MMM d, yyyy")}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-slate-500">Reference (UTR)</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {selectedPayment.utrNumber || selectedPayment.transactionId || "N/A"}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 my-2 pt-3 flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700">Claimed Amount</span>
                      <span className="text-base font-bold text-emerald-600">₹{parseFloat(selectedPayment.amount).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rejectionReason" className="text-xs font-semibold text-slate-600 mb-1.5 block">Rejection Reason <span className="text-slate-400 font-normal">(required if rejecting)</span></Label>
                      <Input
                        id="rejectionReason"
                        placeholder="e.g. Blurry screenshot, UTR mismatch..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-9 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        onClick={() => handleVerify("REJECTED")}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                        Reject
                      </Button>
                      <Button 
                        className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        onClick={() => handleVerify("APPROVED")}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Screenshot */}
                <div className="md:col-span-3 border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-50">
                  <div className="bg-white px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Payment Proof
                    </span>
                    {selectedPayment.proofFileUrl && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 cursor-pointer" onClick={() => window.open(selectedPayment.proofFileUrl!, '_blank')}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open Full Size
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 p-2 flex items-center justify-center min-h-[350px] relative">
                    {selectedPayment.proofFileUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={selectedPayment.proofFileUrl} 
                        alt="Payment Proof" 
                        className="max-w-full max-h-[400px] object-contain rounded border border-slate-200/50 shadow-sm"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <Receipt className="w-10 h-10 mb-2 opacity-30" />
                        <span className="text-sm font-medium">No proof uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

