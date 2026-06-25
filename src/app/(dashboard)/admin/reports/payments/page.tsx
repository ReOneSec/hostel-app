"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertTriangle, Receipt, Wallet, Banknote, CalendarClock, TrendingUp, UserX, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function PaymentsReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostel, setSelectedHostel] = useState("");

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    fetch("/api/hostels").then(r => r.json()).then(j => {
      if (j.success) setHostels(j.data || []);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [month, year, selectedHostel]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      if (selectedHostel) params.set("hostelId", selectedHostel);
      const res = await fetch(`/api/reports/payments?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/reports">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg shrink-0 text-slate-500 hover:text-slate-900 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Collection and overdue tracking</p>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 justify-between md:items-center">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 flex overflow-x-auto">
            {months.map((m, i) => (
              <button
                key={m}
                onClick={() => setMonth(i + 1)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  month === i + 1 
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 flex shrink-0">
            {[year - 1, year, year + 1].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  year === y 
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        
        <Select value={selectedHostel} onValueChange={(val) => setSelectedHostel(val || "")}>
          <SelectTrigger className="w-full md:w-[200px] h-9 border-slate-200 rounded-lg text-sm bg-white shrink-0">
            <SelectValue placeholder="All Hostels">
              {selectedHostel === "all" || !selectedHostel ? "All Hostels" : hostels.find((h: any) => h.id === selectedHostel)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hostels</SelectItem>
            {hostels.map((h: any) => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-400 mt-3">Loading payment data…</p>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-slate-500">Failed to load data.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Billed</p>
                <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">₹{Number(data.summary.totalBilled).toLocaleString("en-IN")}</p>
              <p className="text-xs text-slate-500 mt-1">{data.summary.totalBills} bills generated</p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collected</p>
                <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-700">₹{Number(data.summary.totalReceived).toLocaleString("en-IN")}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                  {data.summary.totalBilled > 0 ? Math.round((data.summary.totalReceived / data.summary.totalBilled) * 100) : 0}%
                </span>
                <span className="text-xs text-slate-500">collected</span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
                <div className="w-6 h-6 rounded bg-amber-50 flex items-center justify-center">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600">₹{Number(data.summary.totalPending).toLocaleString("en-IN")}</p>
              <p className="text-xs text-slate-500 mt-1">awaiting payment</p>
            </div>
            
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5 ring-1 ring-red-200/80 bg-red-50/10">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Overdue</p>
                <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">₹{Number(data.summary.totalOverdue).toLocaleString("en-IN")}</p>
              <p className="text-xs text-red-500/80 mt-1 font-medium">{data.summary.overdueCount} students</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden lg:col-span-1 h-fit">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Status Breakdown</h3>
                  <p className="text-xs text-slate-400">By bill count & volume</p>
                </div>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {Object.entries(data.statusBreakdown).map(([status, info]: [string, any]) => {
                    let colorClass = "bg-slate-100 text-slate-700 border-slate-200";
                    let icon = <Banknote className="w-4 h-4 text-slate-500" />;
                    
                    if (status === "PAID") {
                      colorClass = "bg-green-50 text-green-700 border-green-200";
                      icon = <Wallet className="w-4 h-4 text-green-600" />;
                    } else if (status === "OVERDUE") {
                      colorClass = "bg-red-50 text-red-700 border-red-200";
                      icon = <AlertTriangle className="w-4 h-4 text-red-600" />;
                    } else if (status === "PARTIALLY_PAID") {
                      colorClass = "bg-amber-50 text-amber-700 border-amber-200";
                      icon = <TrendingUp className="w-4 h-4 text-amber-600" />;
                    }

                    return (
                      <div key={status} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${colorClass.split(' ')[0]}`}>
                            {icon}
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border uppercase tracking-wider mb-1 ${colorClass}`}>
                              {status.replace(/_/g, " ")}
                            </span>
                            <p className="text-xs text-slate-500">{info.count} bills</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-slate-800">₹{Number(info.amount).toLocaleString("en-IN")}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Overdue Students Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                      <UserX className="w-3.5 h-3.5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Overdue Students</h3>
                      <p className="text-xs text-slate-400">Requires immediate attention</p>
                    </div>
                  </div>
                  {data.overdueStudents.length > 0 && (
                    <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                      {data.overdueStudents.length} Overdue
                    </span>
                  )}
                </div>

                {data.overdueStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">All clear!</h3>
                    <p className="text-xs text-slate-500">There are no overdue payments for this period.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block">
                      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hostel</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Paid</span>
                        <span className="text-xs font-semibold text-red-600 uppercase tracking-wider text-right">Overdue</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Due Date</span>
                      </div>
                      
                      {data.overdueStudents.map((s: any) => (
                        <div key={s.userId} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                          <span className="text-sm font-medium text-slate-800 truncate pr-2">{s.name}</span>
                          <span className="text-xs text-slate-600 truncate pr-2">{s.hostel}</span>
                          <span className="text-sm text-slate-700 text-right">₹{Number(s.totalAmount).toLocaleString("en-IN")}</span>
                          <span className="text-sm text-emerald-600 text-right">₹{Number(s.paidAmount).toLocaleString("en-IN")}</span>
                          <span className="text-sm font-bold text-red-600 text-right">₹{Number(s.overdueAmount).toLocaleString("en-IN")}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-slate-600">{format(new Date(s.dueDate), "MMM d, yy")}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-3">
                      {data.overdueStudents.map((s: any) => (
                        <div key={s.userId} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                          <div className="flex items-start justify-between mb-3">
                            <div className="min-w-0 pr-3">
                              <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{s.hostel}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-medium text-slate-500 mb-0.5">Due</p>
                              <p className="text-xs text-slate-700">{format(new Date(s.dueDate), "MMM d, yy")}</p>
                            </div>
                          </div>
                          <div className="space-y-2 pt-3 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">Total Billed</span>
                              <span className="text-sm text-slate-700">₹{Number(s.totalAmount).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">Amount Paid</span>
                              <span className="text-sm text-emerald-600">₹{Number(s.paidAmount).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                              <span className="text-xs font-semibold text-slate-700">Overdue</span>
                              <span className="text-sm font-bold text-red-600">₹{Number(s.overdueAmount).toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Ensure lucide icon CheckCircle2 is imported if I used it, wait, I didn't import it in the file.
// Let me update the import list to include CheckCircle2 just in case.

