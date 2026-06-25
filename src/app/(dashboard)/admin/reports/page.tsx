"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CreditCard, UtensilsCrossed, Users, Loader2, ArrowRight } from "lucide-react";

export default function ReportsHubPage() {
  const [occupancy, setOccupancy] = useState<any>(null);
  const [payments, setPayments] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [occRes, payRes] = await Promise.all([
          fetch("/api/reports/occupancy"),
          fetch("/api/reports/payments"),
        ]);
        const occJson = await occRes.json();
        const payJson = await payRes.json();
        if (occJson.success) setOccupancy(occJson.data.totals);
        if (payJson.success) setPayments(payJson.data.summary);
      } catch (e) {
        console.error("Failed to load report summaries", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const reports = [
    {
      title: "Occupancy Report",
      description: "Bed utilization across all hostels and rooms",
      href: "/admin/reports/occupancy",
      icon: Building2,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-100",
      hoverRing: "hover:ring-blue-500/20",
      metric: occupancy ? `${occupancy.occupancyPercent}%` : null,
      metricLabel: "Overall Occupancy",
      metricSub: occupancy ? `${occupancy.occupiedBeds}/${occupancy.totalBeds} beds` : null,
    },
    {
      title: "Payment Report",
      description: "Monthly billing, collections, and overdue tracking",
      href: "/admin/reports/payments",
      icon: CreditCard,
      color: "bg-green-50",
      iconColor: "text-green-600",
      borderColor: "border-green-100",
      hoverRing: "hover:ring-green-500/20",
      metric: payments ? `₹${Number(payments.totalReceived).toLocaleString("en-IN")}` : null,
      metricLabel: "Collected This Month",
      metricSub: payments ? `of ₹${Number(payments.totalBilled).toLocaleString("en-IN")} billed` : null,
    },
    {
      title: "Mess Report",
      description: "Mess session costs, settlements, and meal analytics",
      href: "/admin/reports/mess",
      icon: UtensilsCrossed,
      color: "bg-amber-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-100",
      hoverRing: "hover:ring-amber-500/20",
      metric: null,
      metricLabel: "View Details",
      metricSub: "Session-wise breakdown",
    },
    {
      title: "Student Report",
      description: "Full student roster with hostel assignments and transfers",
      href: "/admin/reports/students",
      icon: Users,
      color: "bg-purple-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-100",
      hoverRing: "hover:ring-purple-500/20",
      metric: null,
      metricLabel: "View Roster",
      metricSub: "Export to CSV available",
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Comprehensive insights across occupancy, payments, mess, and students.
        </p>
      </div>

      {/* Quick Stats Bar */}
      {!loading && (occupancy || payments) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {occupancy && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Beds</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{occupancy.totalBeds}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupied</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold text-slate-800">{occupancy.occupiedBeds}</p>
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-md font-medium border border-green-100">
                    {occupancy.occupancyPercent}%
                  </span>
                </div>
              </div>
            </>
          )}
          {payments && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collected</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  ₹{Number(payments.totalReceived).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold text-red-600">
                    ₹{Number(payments.totalOverdue).toLocaleString("en-IN")}
                  </p>
                  {payments.overdueCount > 0 && (
                    <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-md font-medium border border-red-100">
                      {payments.overdueCount} {payments.overdueCount === 1 ? 'student' : 'students'}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Report Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-400 mt-3">Loading reports overview…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reports.map((report) => (
            <Link key={report.href} href={report.href} className="group block h-full">
              <div className={`h-full bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:ring-2 ${report.hoverRing} flex flex-col`}>
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${report.color} ${report.borderColor} border flex items-center justify-center shrink-0`}>
                        <report.icon className={`w-5 h-5 ${report.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{report.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{report.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-blue-600 transition-all duration-200 shrink-0 mt-1" />
                  </div>
                </div>
                
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 mt-auto">
                  {report.metric ? (
                    <div>
                      <p className="text-lg font-bold text-slate-800">{report.metric}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {report.metricLabel} <span className="text-slate-300 mx-1">•</span> <span className="text-slate-400 font-normal">{report.metricSub}</span>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{report.metricLabel}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{report.metricSub}</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

