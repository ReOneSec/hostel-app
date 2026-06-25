"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Receipt, Calendar, CreditCard, AlertCircle, Download, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { generateInvoicePDF } from "@/lib/pdf-generator";

export default function StudentBillsPage() {
  const [bills, setBills] = useState<any[]>([]);
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
      setBills(data || []);
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

  const currentMonthBill = bills.length > 0 ? bills[0] : null;
  const previousBills = bills.length > 1 ? bills.slice(1) : [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading your bills...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Bills</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View your monthly rent, establishment fees, and mess charges.
        </p>
      </div>

      {!currentMonthBill ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
            <Receipt className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-base font-bold text-slate-800 mb-1">No Bills Generated Yet</p>
          <p className="text-sm text-slate-500">Your bills will appear here on the 1st of every month.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group">
              <div className="absolute top-0 right-0 p-32 bg-blue-50/30 rounded-bl-full -z-0 transition-transform duration-700 group-hover:scale-110 pointer-events-none" />
              
              <div className="px-6 py-5 border-b border-slate-100 relative z-10 bg-white/50 backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      {new Date(currentMonthBill.year, currentMonthBill.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} Bill
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                      Due by <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{format(new Date(currentMonthBill.dueDate), "MMM d, yyyy")}</span>
                    </p>
                  </div>
                  {getStatusBadge(currentMonthBill.status)}
                </div>
              </div>
              
              <div className="p-6 space-y-4 relative z-10 bg-white">
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Monthly Rent</span>
                    <span className="font-medium text-slate-900">₹{parseFloat(currentMonthBill.rentAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Establishment Fee</span>
                    <span className="font-medium text-slate-900">₹{parseFloat(currentMonthBill.establishmentFee).toFixed(2)}</span>
                  </div>
                  {parseFloat(currentMonthBill.bedFee) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Bed Fee</span>
                      <span className="font-medium text-slate-900">₹{parseFloat(currentMonthBill.bedFee).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(currentMonthBill.messCharge) > 0 && (
                      <div className="flex justify-between items-center text-sm pt-3.5 border-t border-slate-100">
                        <span className="text-slate-500">Mess Charges (Last Month)</span>
                        <span className="font-medium text-slate-900">₹{parseFloat(currentMonthBill.messCharge).toFixed(2)}</span>
                      </div>
                  )}
                  {parseFloat(currentMonthBill.lateFee) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1.5 text-red-500 font-medium"><AlertCircle className="w-4 h-4" /> Late Fee</span>
                      <span className="font-bold text-red-600">₹{parseFloat(currentMonthBill.lateFee).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Total Amount</span>
                  <span className="text-2xl font-black text-slate-900 tracking-tight">₹{parseFloat(currentMonthBill.totalAmount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                
                {parseFloat(currentMonthBill.paidAmount) > 0 && (
                  <div className="flex justify-between items-center text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg font-medium">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Amount Paid</span>
                    <span>- ₹{parseFloat(currentMonthBill.paidAmount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 border-t border-slate-100 p-6 relative z-10">
                <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Remaining Due</p>
                    <p className="font-black text-2xl text-slate-900 tracking-tight">
                      ₹{(parseFloat(currentMonthBill.totalAmount) - parseFloat(currentMonthBill.paidAmount)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                  </div>
                  
                  <div className="flex w-full sm:w-auto gap-2">
                    {(currentMonthBill.status === "GENERATED" || currentMonthBill.status === "PARTIALLY_PAID" || currentMonthBill.status === "OVERDUE") ? (
                      <>
                        <Button 
                          variant="outline"
                          onClick={() => generateInvoicePDF(currentMonthBill)}
                          className="flex-1 sm:flex-none h-10 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-sm"
                        >
                          <Download className="w-4 h-4 mr-2 text-slate-400" />
                          Invoice
                        </Button>
                        <Button 
                          onClick={() => router.push(`/student/payments/upload?billId=${currentMonthBill.id}`)}
                          className="flex-1 sm:flex-none h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline"
                        onClick={() => generateInvoicePDF(currentMonthBill)}
                        className="w-full sm:w-auto h-10 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm"
                      >
                        <Download className="w-4 h-4 mr-2 text-slate-400" />
                        Download Invoice
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-1 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Previous Bills
            </h3>
            {previousBills.length === 0 ? (
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-6 text-center">
                <p className="text-sm text-slate-500 font-medium">No previous bills found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {previousBills.map((bill: any) => (
                  <div key={bill.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => generateInvoicePDF(bill)}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {new Date(bill.year, bill.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                      </span>
                      {getStatusBadge(bill.status)}
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Total: <span className="text-slate-900">₹{parseFloat(bill.totalAmount).toLocaleString('en-IN', {maximumFractionDigits: 0})}</span></span>
                      {bill.status !== "PAID" && (
                        <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">Due: ₹{(parseFloat(bill.totalAmount) - parseFloat(bill.paidAmount)).toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                      )}
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                       <Download className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

