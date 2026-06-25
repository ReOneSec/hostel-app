"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Receipt, CreditCard, Download, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { generateReceiptPDF } from "@/lib/pdf-generator";

type PaymentData = {
  id: string;
  amount: string;
  paymentDate: string;
  status: string;
  transactionId: string | null;
  utrNumber: string | null;
  proofFileUrl: string | null;
  rejectionReason: string | null;
  billId: string;
  bill: {
    month: number;
    year: number;
    totalAmount: string;
  };
  user: any;
};

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/student/payments");
      if (!res.ok) throw new Error("Failed to fetch payments");
      const { data } = await res.json();
      setPayments(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load payment history");
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment History</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View all your past payments and their verification status.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">My Payments</h3>
            <p className="text-xs text-slate-400">Chronological history of transactions</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
              <p className="text-sm font-medium">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <Receipt className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">No payments recorded yet</p>
              <p className="text-xs text-slate-500">When you make a payment, it will appear here.</p>
            </div>
          ) : (
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_1.5fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bill Month</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Date</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount Paid</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference (UTR)</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Proof / Receipt</span>
              </div>
              
              {payments.map((payment) => (
                <div key={payment.id} className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_1.5fr] px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                  <span className="text-sm font-bold text-slate-900">
                    {new Date(payment.bill.year, payment.bill.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  
                  <span className="text-sm text-slate-600 font-medium">
                    {format(new Date(payment.paymentDate), "MMM d, yyyy")}
                  </span>
                  
                  <span className="text-sm font-black text-emerald-600 text-right">
                    ₹{parseFloat(payment.amount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                  
                  <div className="pl-4">
                    <span className="text-xs font-mono font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {payment.utrNumber || payment.transactionId || "N/A"}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 items-start">
                    {getStatusBadge(payment.status)}
                    {payment.status === "REJECTED" && payment.rejectionReason && (
                      <span className="text-xs text-red-600 font-medium max-w-[150px] truncate" title={payment.rejectionReason}>
                        {payment.rejectionReason}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    {payment.proofFileUrl ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer"
                        onClick={() => window.open(payment.proofFileUrl as string, '_blank')}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        Proof
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 h-8 flex items-center px-2">No proof</span>
                    )}
                    
                    {payment.status === "APPROVED" && (
                      <Button 
                        size="sm"
                        className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                        onClick={() => generateReceiptPDF(payment)}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

