"use client";

import { useEffect, useState } from "react";
import { TablePageSkeleton } from "@/components/skeletons/page-skeletons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Receipt,
  Wallet,
  Banknote,
  CalendarClock,
  TrendingUp,
  UserX,
  Clock,
  CheckCircle2,
  Calendar,
  BarChart3,
  Download,
  ChevronRight,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";

export default function PaymentsReportPage() {
  const [viewMode, setViewMode] = useState<"annual" | "monthly">("annual");
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [annualData, setAnnualData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostel, setSelectedHostel] = useState("");

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/hostels")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setHostels(j.data || []);
      })
      .catch((e) => console.error("Failed to load hostels", e));
  }, []);

  useEffect(() => {
    fetchData();
  }, [viewMode, month, year, selectedHostel]);

  async function fetchData() {
    setLoading(true);
    try {
      if (viewMode === "annual") {
        const params = new URLSearchParams({ year: String(year) });
        if (selectedHostel && selectedHostel !== "all") {
          params.set("hostelId", selectedHostel);
        }
        const res = await fetch(`/api/reports/payments/annual?${params}`);
        const json = await res.json();
        if (json.success) setAnnualData(json.data);
      } else {
        const params = new URLSearchParams({ month: String(month), year: String(year) });
        if (selectedHostel && selectedHostel !== "all") {
          params.set("hostelId", selectedHostel);
        }
        const res = await fetch(`/api/reports/payments?${params}`);
        const json = await res.json();
        if (json.success) setMonthlyData(json.data);
      }
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

  function handleDrillDown(targetMonth: number) {
    setMonth(targetMonth);
    setViewMode("monthly");
  }

  function handleExportCSV() {
    if (!annualData) return;
    const hostelName =
      selectedHostel && selectedHostel !== "all"
        ? hostels.find((h) => h.id === selectedHostel)?.name || "Hostel"
        : "All_Hostels";

    const headers = [
      "Month",
      "Total Billed (INR)",
      "Revenue Collected (INR)",
      "Overdue (INR)",
      "Pending (INR)",
      "Collection Rate (%)",
      "Overdue Accounts",
      "Total Bills",
    ];

    const rows = annualData.months.map((m: any) => [
      m.monthName,
      m.totalBilled,
      m.totalCollected,
      m.totalOverdue,
      m.totalPending,
      `${m.collectionRate}%`,
      m.overdueCount,
      m.totalBills,
    ]);

    if (annualData.otherFees) {
      rows.push([
        annualData.otherFees.label,
        annualData.otherFees.totalBilled,
        annualData.otherFees.totalCollected,
        annualData.otherFees.totalOverdue,
        annualData.otherFees.totalPending,
        `${annualData.otherFees.collectionRate}%`,
        0,
        annualData.otherFees.totalBills,
      ]);
    }

    rows.push([
      `TOTAL ${annualData.year}`,
      annualData.summary.totalBilled,
      annualData.summary.totalRevenue,
      annualData.summary.totalOverdue,
      annualData.summary.totalPending,
      `${annualData.summary.collectionRate}%`,
      annualData.summary.totalOverdueCount,
      annualData.summary.totalBills,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Financial_Report_${annualData.year}_${hostelName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Calculate highest scale for chart visual
  const maxChartValue = Math.max(
    ...(annualData?.months?.map((m: any) => Math.max(m.totalBilled, m.totalCollected, m.totalOverdue)) || [1000]),
    1000
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/reports">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg shrink-0 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment & Revenue Report</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Super Admin
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Comprehensive month-by-month revenue, overdue amounts, and collection metrics.
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setViewMode("annual")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "annual"
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            12-Month Financials
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "monthly"
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Single Month Drill-Down
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 justify-between md:items-center">
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === "monthly" && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 flex overflow-x-auto max-w-full">
              {months.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMonth(i + 1)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    month === i + 1
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Year Buttons */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 flex shrink-0">
            {[year - 1, year, year + 1].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
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

        <div className="flex items-center gap-2.5">
          <Select value={selectedHostel} onValueChange={(val) => setSelectedHostel(val || "")}>
            <SelectTrigger className="w-full md:w-[200px] h-9 border-slate-200 rounded-lg text-sm bg-white shrink-0">
              <SelectValue placeholder="All Hostels">
                {selectedHostel === "all" || !selectedHostel
                  ? "All Hostels"
                  : hostels.find((h: any) => h.id === selectedHostel)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Hostels</SelectItem>
              {hostels.map((h: any) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {viewMode === "annual" && annualData && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <TablePageSkeleton />
      ) : viewMode === "annual" ? (
        /* ================= ANNUAL 12-MONTH VIEW ================= */
        !annualData ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500">Failed to load annual financial data.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Annual KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5 ring-1 ring-emerald-200/80 bg-gradient-to-br from-white via-white to-emerald-50/30">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Total Revenue Collected
                  </p>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-emerald-700" />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-extrabold text-emerald-700">
                  ₹{Number(annualData.summary.totalRevenue).toLocaleString("en-IN")}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    {annualData.summary.collectionRate}%
                  </span>
                  <span className="text-xs text-slate-500">collected of total billed</span>
                </div>
              </div>

              {/* Total Overdue */}
              <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-5 ring-1 ring-rose-200/80 bg-gradient-to-br from-white via-white to-rose-50/30">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                    Total Overdue Amount
                  </p>
                  <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-extrabold text-rose-600">
                  ₹{Number(annualData.summary.totalOverdue).toLocaleString("en-IN")}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                    {annualData.summary.totalOverdueCount} students
                  </span>
                  <span className="text-xs text-slate-500">with overdue balances</span>
                </div>
              </div>

              {/* Total Billed */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Billed ({year})
                  </p>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-extrabold text-slate-800">
                  ₹{Number(annualData.summary.totalBilled).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {annualData.summary.totalBills} bills generated in {year}
                </p>
              </div>

              {/* Pending / Highlights */}
              <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 ring-1 ring-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50/20">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    Pending Collection
                  </p>
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <CalendarClock className="w-4 h-4 text-amber-700" />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-extrabold text-amber-700">
                  ₹{Number(annualData.summary.totalPending).toLocaleString("en-IN")}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  {annualData.summary.highestRevenueMonth && (
                    <span className="text-[11px] text-slate-500 truncate">
                      Best: <strong className="text-slate-800">{annualData.summary.highestRevenueMonth.monthName}</strong> (₹{annualData.summary.highestRevenueMonth.amount.toLocaleString("en-IN")})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Visual Revenue vs Overdue Monthly Bar Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Monthly Revenue vs Overdue Comparison ({year})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comparison of collected revenue against overdue balance for each month. Click any month to drill down.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Revenue Collected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Overdue Amount</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-200 shrink-0" />
                    <span className="text-slate-600 font-medium">Billed Amount</span>
                  </div>
                </div>
              </div>

              {/* Chart Bars */}
              <div className="grid grid-cols-12 gap-1.5 sm:gap-2 pt-4 items-end min-h-[220px]">
                {annualData.months.map((m: any) => {
                  const revenueHeight = Math.max(4, Math.round((m.totalCollected / maxChartValue) * 160));
                  const overdueHeight = Math.max(m.totalOverdue > 0 ? 4 : 0, Math.round((m.totalOverdue / maxChartValue) * 160));
                  const isCurrentMonth = m.month === now.getMonth() + 1 && year === now.getFullYear();

                  return (
                    <div
                      key={m.month}
                      onClick={() => handleDrillDown(m.month)}
                      onMouseEnter={() => setHoveredMonth(m.month)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      className={`group relative flex flex-col items-center cursor-pointer transition-all p-1 rounded-lg ${
                        isCurrentMonth ? "bg-blue-50/60 ring-1 ring-blue-300" : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Tooltip on hover */}
                      <div
                        className={`absolute -top-16 z-20 pointer-events-none transition-all duration-150 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] shadow-lg whitespace-nowrap ${
                          hoveredMonth === m.month ? "opacity-100 scale-100" : "opacity-0 scale-95"
                        }`}
                      >
                        <p className="font-semibold text-white">{m.monthName}</p>
                        <p className="text-emerald-300">Revenue: ₹{m.totalCollected.toLocaleString("en-IN")}</p>
                        <p className="text-rose-300">Overdue: ₹{m.totalOverdue.toLocaleString("en-IN")}</p>
                        <p className="text-slate-300 text-[10px]">Rate: {m.collectionRate}%</p>
                      </div>

                      {/* Bar columns */}
                      <div className="w-full flex items-end justify-center gap-1 h-[170px] pb-1">
                        {/* Revenue Bar */}
                        <div
                          style={{ height: `${revenueHeight}px` }}
                          className={`w-2.5 sm:w-4 rounded-t transition-all ${
                            m.totalCollected > 0
                              ? "bg-emerald-500 group-hover:bg-emerald-600"
                              : "bg-slate-100"
                          }`}
                        />
                        {/* Overdue Bar */}
                        <div
                          style={{ height: `${overdueHeight}px` }}
                          className={`w-2.5 sm:w-4 rounded-t transition-all ${
                            m.totalOverdue > 0
                              ? "bg-rose-500 group-hover:bg-rose-600"
                              : "bg-slate-100"
                          }`}
                        />
                      </div>

                      {/* Month Label */}
                      <div className="w-full text-center pt-1 border-t border-slate-100">
                        <span className={`text-[11px] font-semibold block ${isCurrentMonth ? "text-blue-600" : "text-slate-600"}`}>
                          {m.monthShort}
                        </span>
                        <span className="text-[10px] text-slate-400 block sm:hidden">
                          {m.collectionRate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comprehensive 12-Month Financial Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Each Month's Financial Breakdown</h3>
                    <p className="text-xs text-slate-400">Detailed month-by-month accounting matrix</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Showing 12 months for <strong>{year}</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4 text-right">Total Billed</th>
                      <th className="py-3 px-4 text-right text-emerald-700">Revenue (Collected)</th>
                      <th className="py-3 px-4 text-right text-rose-600">Overdue Amount</th>
                      <th className="py-3 px-4 text-right text-amber-700">Pending</th>
                      <th className="py-3 px-4 text-center">Collection Rate</th>
                      <th className="py-3 px-4 text-center">Overdue Students</th>
                      <th className="py-3 px-4 text-center">Bills</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {annualData.months.map((m: any) => {
                      const isCurrentMonth = m.month === now.getMonth() + 1 && year === now.getFullYear();

                      return (
                        <tr
                          key={m.month}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCurrentMonth ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                            <span>{m.monthName}</span>
                            {isCurrentMonth && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                            ₹{m.totalBilled.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                            ₹{m.totalCollected.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold">
                            {m.totalOverdue > 0 ? (
                              <span className="text-rose-600 font-extrabold">
                                ₹{m.totalOverdue.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">₹0</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right text-amber-600 font-medium">
                            ₹{m.totalPending.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    m.collectionRate >= 80
                                      ? "bg-emerald-500"
                                      : m.collectionRate >= 50
                                      ? "bg-amber-500"
                                      : m.collectionRate > 0
                                      ? "bg-rose-500"
                                      : "bg-slate-200"
                                  }`}
                                  style={{ width: `${m.collectionRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 w-8 text-right">
                                {m.collectionRate}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {m.overdueCount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {m.overdueCount} {m.overdueCount === 1 ? "student" : "students"}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-600">
                            {m.totalBills}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDrillDown(m.month)}
                              className="h-7 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold cursor-pointer"
                            >
                              View Details
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Annual Bed & Establishment Fees Row (month: 0) */}
                    {annualData.otherFees && (
                      <tr className="bg-slate-50/50 hover:bg-slate-100/50 border-t-2 border-slate-200 font-medium">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>{annualData.otherFees.label}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                          ₹{annualData.otherFees.totalBilled.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                          ₹{annualData.otherFees.totalCollected.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                          ₹{annualData.otherFees.totalOverdue.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right text-amber-600 font-medium">
                          ₹{annualData.otherFees.totalPending.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${annualData.otherFees.collectionRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 w-8 text-right">
                              {annualData.otherFees.collectionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                        <td className="py-3.5 px-4 text-center text-slate-600">
                          {annualData.otherFees.totalBills}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                      </tr>
                    )}
                  </tbody>

                  {/* Summary / Total Footer */}
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                      <td className="py-4 px-4 text-sm font-extrabold uppercase tracking-wider text-slate-100">
                        Total ({year})
                      </td>
                      <td className="py-4 px-4 text-right text-sm">
                        ₹{annualData.summary.totalBilled.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-emerald-400 font-extrabold">
                        ₹{annualData.summary.totalRevenue.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-rose-400 font-extrabold">
                        ₹{annualData.summary.totalOverdue.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-amber-300">
                        ₹{annualData.summary.totalPending.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4 text-center text-sm text-emerald-300">
                        {annualData.summary.collectionRate}%
                      </td>
                      <td className="py-4 px-4 text-center text-sm text-rose-300">
                        {annualData.summary.totalOverdueCount} students
                      </td>
                      <td className="py-4 px-4 text-center text-sm text-slate-300">
                        {annualData.summary.totalBills}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-400">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ================= SINGLE MONTH DEEP DIVE ================= */
        !monthlyData ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500">Failed to load data for this month.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick banner back to Annual Overview */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-900 text-xs sm:text-sm">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>
                  Viewing detailed single-month breakdown for <strong>{months[month - 1]} {year}</strong>
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("annual")}
                className="h-7 text-xs bg-white text-blue-700 border-blue-200 hover:bg-blue-50 font-semibold cursor-pointer"
              >
                ← Back to 12-Month Overview
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Billed</p>
                  <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
                    <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  ₹{Number(monthlyData.summary.totalBilled).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">{monthlyData.summary.totalBills} bills generated</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collected (Revenue)</p>
                  <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5 text-green-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  ₹{Number(monthlyData.summary.totalReceived).toLocaleString("en-IN")}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                    {monthlyData.summary.totalBilled > 0
                      ? Math.round((monthlyData.summary.totalReceived / monthlyData.summary.totalBilled) * 100)
                      : 0}
                    %
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
                <p className="text-2xl font-bold text-amber-600">
                  ₹{Number(monthlyData.summary.totalPending).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">awaiting payment</p>
              </div>

              <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-5 ring-1 ring-rose-200/80 bg-rose-50/10">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Overdue</p>
                  <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-rose-600">
                  ₹{Number(monthlyData.summary.totalOverdue).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-rose-500/80 mt-1 font-medium">
                  {monthlyData.summary.overdueCount} students
                </p>
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
                    {Object.entries(monthlyData.statusBreakdown).map(([status, info]: [string, any]) => {
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
                        <div
                          key={status}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-md ${colorClass.split(" ")[0]}`}>{icon}</div>
                            <div>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border uppercase tracking-wider mb-1 ${colorClass}`}
                              >
                                {status.replace(/_/g, " ")}
                              </span>
                              <p className="text-xs text-slate-500">{info.count} bills</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-slate-800">
                            ₹{Number(info.amount).toLocaleString("en-IN")}
                          </p>
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
                        <h3 className="text-sm font-semibold text-slate-800">Overdue Students ({months[month - 1]})</h3>
                        <p className="text-xs text-slate-400">Requires immediate attention</p>
                      </div>
                    </div>
                    {monthlyData.overdueStudents.length > 0 && (
                      <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                        {monthlyData.overdueStudents.length} Overdue
                      </span>
                    )}
                  </div>

                  {monthlyData.overdueStudents.length === 0 ? (
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
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Student
                          </span>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Hostel
                          </span>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                            Total
                          </span>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                            Paid
                          </span>
                          <span className="text-xs font-semibold text-red-600 uppercase tracking-wider text-right">
                            Overdue
                          </span>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                            Due Date
                          </span>
                        </div>

                        {monthlyData.overdueStudents
                          .slice()
                          .sort((a: any, b: any) =>
                            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
                          )
                          .map((s: any) => (
                            <div
                              key={s.userId}
                              className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center"
                            >
                              <span className="text-sm font-medium text-slate-800 truncate pr-2">
                                {s.name}
                              </span>
                              <span className="text-xs text-slate-600 truncate pr-2">{s.hostel}</span>
                              <span className="text-sm text-slate-700 text-right">
                                ₹{Number(s.totalAmount).toLocaleString("en-IN")}
                              </span>
                              <span className="text-sm text-emerald-600 text-right">
                                ₹{Number(s.paidAmount).toLocaleString("en-IN")}
                              </span>
                              <span className="text-sm font-bold text-red-600 text-right">
                                ₹{Number(s.overdueAmount).toLocaleString("en-IN")}
                              </span>
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-slate-600">
                                  {format(new Date(s.dueDate), "MMM d, yy")}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden p-4 space-y-3">
                        {monthlyData.overdueStudents
                          .slice()
                          .sort((a: any, b: any) =>
                            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
                          )
                          .map((s: any) => (
                            <div
                              key={s.userId}
                              className="border border-slate-100 rounded-xl p-4 bg-slate-50/30"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="min-w-0 pr-3">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                                  <p className="text-xs text-slate-500 truncate mt-0.5">{s.hostel}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-medium text-slate-500 mb-0.5">Due</p>
                                  <p className="text-xs text-slate-700">
                                    {format(new Date(s.dueDate), "MMM d, yy")}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2 pt-3 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-500">Total Billed</span>
                                  <span className="text-sm text-slate-700">
                                    ₹{Number(s.totalAmount).toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-500">Amount Paid</span>
                                  <span className="text-sm text-emerald-600">
                                    ₹{Number(s.paidAmount).toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                                  <span className="text-xs font-semibold text-slate-700">Overdue</span>
                                  <span className="text-sm font-bold text-red-600">
                                    ₹{Number(s.overdueAmount).toLocaleString("en-IN")}
                                  </span>
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
          </div>
        )
      )}
    </div>
  );
}
