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
import { ArrowLeft, UtensilsCrossed, Loader2, Coins, Receipt, ArrowDownToLine, ArrowUpFromLine, Users } from "lucide-react";

export default function MessReportPage() {
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
      const res = await fetch(`/api/reports/mess?${params}`);
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mess Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Session costs, settlements, and meal analytics</p>
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
          <p className="text-sm text-slate-400 mt-3">Loading mess data…</p>
        </div>
      ) : !data || data.sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No mess sessions found</h3>
          <p className="text-xs text-slate-500">There are no records for {months[month - 1]} {year}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.sessions.map((session: any) => (
            <div key={session.sessionId} className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              {/* Session Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-sm">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{session.hostelName}</h3>
                    <p className="text-xs text-slate-500">
                      {months[session.month - 1]} {session.year} <span className="mx-1.5">•</span> {session.studentCount} students
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border uppercase tracking-wider ${
                    session.status === "CLOSED" 
                      ? "bg-green-50 text-green-700 border-green-200" 
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {session.status}
                  </span>
                </div>
              </div>

              <div className="p-5">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meal Charge</p>
                      <Coins className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                      {session.universalMealCharge != null
                        ? `₹${session.universalMealCharge.toFixed(2)}`
                        : "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">per meal</p>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Mess Cost</p>
                      <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">₹{Number(session.totalMessCost).toLocaleString("en-IN")}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded">Mkt: ₹{Number(session.totalMarketExpenses).toLocaleString("en-IN")}</span>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded">Wtr: ₹{Number(session.totalWaterExpenses).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest Recovery</p>
                      <ArrowDownToLine className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">₹{Number(session.guestRecovery).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{session.totalGuestMeals} guest meals</p>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Meals</p>
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{session.totalStudentMeals}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">student meals consumed</p>
                  </div>
                </div>

                {/* Settlement Table */}
                {session.status === "CLOSED" && session.settlements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <ArrowUpFromLine className="w-4 h-4 text-blue-600" />
                      Settlement Summary
                    </h3>
                    <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                      <>
                        <div className="hidden md:block">
                          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Meals</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Meal Cost</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Contributed</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Liability</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Settlement</span>
                          </div>
                          
                          {session.settlements.map((st: any) => (
                            <div key={st.userId} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors items-center">
                              <span className="text-sm font-medium text-slate-800 truncate pr-2">{st.name}</span>
                              <span className="text-sm text-slate-600 text-center">{st.mealCount}</span>
                              <span className="text-sm text-slate-600 text-right">₹{st.mealCost.toFixed(2)}</span>
                              <span className="text-sm font-medium text-emerald-600 text-right">₹{st.totalContribution.toFixed(2)}</span>
                              <span className="text-sm font-medium text-slate-700 text-right">₹{st.totalLiability.toFixed(2)}</span>
                              <div className="flex justify-end">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded font-bold text-xs border ${
                                  st.netSettlement >= 0 
                                    ? "bg-green-50 text-green-700 border-green-200" 
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}>
                                  {st.netSettlement >= 0 ? "+" : ""}₹{st.netSettlement.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden p-4 space-y-3">
                          {session.settlements.map((st: any) => (
                            <div key={st.userId} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-slate-800 truncate pr-2">{st.name}</span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded font-bold text-xs border shrink-0 ${
                                  st.netSettlement >= 0 
                                    ? "bg-green-50 text-green-700 border-green-200" 
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}>
                                  {st.netSettlement >= 0 ? "+" : ""}₹{st.netSettlement.toFixed(2)}
                                </span>
                              </div>
                              <div className="space-y-2 pt-3 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-500">Meals</span>
                                  <span className="text-sm text-slate-700">{st.mealCount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-500">Meal Cost</span>
                                  <span className="text-sm text-slate-700">₹{st.mealCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-500">Contributed</span>
                                  <span className="text-sm font-medium text-emerald-600">₹{st.totalContribution.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-500">Liability</span>
                                  <span className="text-sm font-medium text-slate-700">₹{st.totalLiability.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

