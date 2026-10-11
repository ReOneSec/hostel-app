"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Receipt, 
  Calendar, 
  CreditCard, 
  AlertCircle, 
  AlertTriangle,
  Download, 
  CheckCircle2, 
  ChevronRight, 
  FileText,
  Clock,
  ArrowRight
} from "lucide-react";
import { BillsPageSkeleton } from "@/components/skeletons/page-skeletons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { generateInvoicePDF } from "@/lib/pdf-generator";

export default function StudentBillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBills();
  }, []);

  async function fetchBills() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/student/bills");
      if (!res.ok) throw new Error("Failed to fetch bills");
      const { data } = await res.json();
      const list = data || [];
      setBills(list);

      // Auto-select: default to the first unpaid bill (e.g. September if pending), otherwise the latest bill
      if (list.length > 0) {
        setSelectedBillId((prev) => {
          if (prev && list.some((b: any) => b.id === prev)) return prev;
          const firstUnpaid = list.find((b: any) => b.status !== "PAID");
          return firstUnpaid ? firstUnpaid.id : list[0].id;
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load bills");
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "PAID":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">Paid</span>;
      case "PARTIALLY_PAID":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200">Partial</span>;
      case "OVERDUE":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider bg-red-50 text-red-700 border-red-200">Overdue</span>;
      case "GENERATED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">Unpaid</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">{status}</span>;
    }
  }

  if (isLoading) {
    return <BillsPageSkeleton />;
  }

  const selectedBill = bills.find((b) => b.id === selectedBillId) || bills[0] || null;
  const pendingBills = bills.filter((b) => b.status !== "PAID");
  const isLatestBill = selectedBill && bills.length > 0 && selectedBill.id === bills[0].id;

  const totalAmount = selectedBill ? parseFloat(selectedBill.totalAmount) : 0;
  const paidAmount = selectedBill ? parseFloat(selectedBill.paidAmount) : 0;
  const remainingDue = Math.max(0, totalAmount - paidAmount);

  const handlePayNow = (bill: any) => {
    const due = Math.max(0, parseFloat(bill.totalAmount) - parseFloat(bill.paidAmount));
    router.push(`/student/payments/upload?billId=${bill.id}&amount=${due}&month=${bill.month}&year=${bill.year}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Bills</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View your monthly rent, establishment fees, mess charges, and upload payment receipts.
        </p>
      </div>

      {/* Alert banner if student has any pending/unpaid bills */}
      {pendingBills.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                You have {pendingBills.length} unpaid bill{pendingBills.length > 1 ? "s" : ""} pending payment
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {pendingBills.map((b) => (
                  <span key={b.id} className="mr-3 font-medium">
                    • {new Date(b.year, b.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}: ₹{(parseFloat(b.totalAmount) - parseFloat(b.paidAmount)).toLocaleString('en-IN', { minimumFractionDigits: 0 })} Due
                  </span>
                ))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {pendingBills.map((b) => (
              <Button
                key={b.id}
                size="sm"
                onClick={() => handlePayNow(b)}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm font-semibold cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                Pay {new Date(b.year, b.month - 1).toLocaleString('default', { month: 'short' })}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!selectedBill ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
            <Receipt className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-base font-bold text-slate-800 mb-1">No Bills Generated Yet</p>
          <p className="text-sm text-slate-500">Your bills will appear here on the 1st of every month.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Selected Bill Card */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group ring-1 ring-slate-100">
              <div className="absolute top-0 right-0 p-32 bg-blue-50/30 rounded-bl-full -z-0 transition-transform duration-700 group-hover:scale-110 pointer-events-none" />
              
              <div className="px-6 py-5 border-b border-slate-100 relative z-10 bg-white/50 backdrop-blur-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        {new Date(selectedBill.year, selectedBill.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} Bill
                      </h2>
                      {!isLatestBill && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Previous Period
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                      Due by <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{format(new Date(selectedBill.dueDate), "MMM d, yyyy")}</span>
                    </p>
                  </div>
                  {getStatusBadge(selectedBill.status)}
                </div>
              </div>
              
              <div className="p-6 space-y-4 relative z-10 bg-white">
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Monthly Rent</span>
                    <span className="font-medium text-slate-900">₹{parseFloat(selectedBill.rentAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Establishment Fee</span>
                    <span className="font-medium text-slate-900">₹{parseFloat(selectedBill.establishmentFee).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedBill.bedFee) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Bed Fee</span>
                      <span className="font-medium text-slate-900">₹{parseFloat(selectedBill.bedFee).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(selectedBill.messCharge) > 0 && (
                    <div className="flex justify-between items-center text-sm pt-3.5 border-t border-slate-100">
                      <span className="text-slate-500">Mess Charges</span>
                      <span className="font-medium text-slate-900">₹{parseFloat(selectedBill.messCharge).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(selectedBill.lateFee) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1.5 text-red-500 font-medium"><AlertCircle className="w-4 h-4" /> Late Fee</span>
                      <span className="font-bold text-red-600">₹{parseFloat(selectedBill.lateFee).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Total Amount</span>
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                {paidAmount > 0 && (
                  <div className="flex justify-between items-center text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg font-medium">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Amount Paid</span>
                    <span>- ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {/* Show any recent payment submissions under review */}
                {selectedBill.payments && selectedBill.payments.length > 0 && (
                  <div className="pt-2">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        Submitted Payment Receipts ({selectedBill.payments.length})
                      </p>
                      {selectedBill.payments.map((p: any) => (
                        <div key={p.id} className="text-xs text-slate-600 flex justify-between items-center pt-1 border-t border-slate-100 first:border-0 first:pt-0">
                          <span>
                            ₹{parseFloat(p.amount).toLocaleString('en-IN')} on {format(new Date(p.paymentDate), "MMM d, yyyy")} {p.utrNumber ? `(UTR: ${p.utrNumber})` : ""}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            p.status === "APPROVED" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : p.status === "PENDING_REVIEW"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {p.status.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 border-t border-slate-100 p-6 relative z-10">
                <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Remaining Due</p>
                    <p className={`font-black text-2xl tracking-tight ${remainingDue > 0 ? "text-red-600" : "text-slate-900"}`}>
                      ₹{remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  <div className="flex w-full sm:w-auto gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => generateInvoicePDF(selectedBill, selectedBill.user?.studentProfile)}
                      className="flex-1 sm:flex-none h-10 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4 mr-2 text-slate-400" />
                      Invoice
                    </Button>

                    {(selectedBill.status !== "PAID" || remainingDue > 0) ? (
                      <Button 
                        onClick={() => handlePayNow(selectedBill)}
                        className="flex-1 sm:flex-none h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-semibold cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Now / Upload Proof
                      </Button>
                    ) : (
                      <div className="hidden sm:flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Fully Settled
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Billing Periods List */}
          <div className="md:col-span-1 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                All Billing Periods ({bills.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Click any month to view details or pay</p>
            </div>

            <div className="space-y-3">
              {bills.map((bill: any) => {
                const isSelected = bill.id === selectedBill?.id;
                const billDue = Math.max(0, parseFloat(bill.totalAmount) - parseFloat(bill.paidAmount));
                const isUnpaid = bill.status !== "PAID" || billDue > 0;

                return (
                  <div 
                    key={bill.id} 
                    onClick={() => setSelectedBillId(bill.id)}
                    className={`
                      rounded-xl border p-4 transition-all group cursor-pointer relative overflow-hidden
                      ${isSelected 
                        ? "bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-sm" 
                        : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
                      }
                    `}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm transition-colors ${isSelected ? "text-blue-700" : "text-slate-900 group-hover:text-blue-600"}`}>
                          {new Date(bill.year, bill.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white">
                            Viewing
                          </span>
                        )}
                      </div>
                      {getStatusBadge(bill.status)}
                    </div>

                    <div className="flex justify-between items-center text-xs mb-3">
                      <span className="text-slate-500 font-medium">
                        Total: <span className="text-slate-900 font-semibold">₹{parseFloat(bill.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </span>
                      {isUnpaid ? (
                        <span className="text-red-600 font-bold bg-red-50 border border-red-200/60 px-2 py-0.5 rounded">
                          Due: ₹{billDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium text-[11px]">
                          ✓ Paid
                        </span>
                      )}
                    </div>

                    {/* Quick action buttons on each card */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateInvoicePDF(bill, bill.user?.studentProfile);
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                          title="Download Invoice"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-[11px] text-slate-400">Invoice</span>
                      </div>

                      {isUnpaid ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePayNow(bill);
                          }}
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md px-2.5 font-semibold shadow-xs cursor-pointer"
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          Pay Now
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBillId(bill.id)}
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md px-2 cursor-pointer"
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
