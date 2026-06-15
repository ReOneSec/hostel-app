"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CreditCard, UtensilsCrossed, Users, Loader2, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

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
      color: "from-blue-500/20 to-indigo-500/20",
      iconColor: "text-blue-600",
      borderColor: "border-blue-500/20",
      metric: occupancy ? `${occupancy.occupancyPercent}%` : null,
      metricLabel: "Overall Occupancy",
      metricSub: occupancy ? `${occupancy.occupiedBeds}/${occupancy.totalBeds} beds` : null,
    },
    {
      title: "Payment Report",
      description: "Monthly billing, collections, and overdue tracking",
      href: "/admin/reports/payments",
      icon: CreditCard,
      color: "from-emerald-500/20 to-green-500/20",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-500/20",
      metric: payments ? `₹${Number(payments.totalReceived).toLocaleString("en-IN")}` : null,
      metricLabel: "Collected This Month",
      metricSub: payments ? `of ₹${Number(payments.totalBilled).toLocaleString("en-IN")} billed` : null,
    },
    {
      title: "Mess Report",
      description: "Mess session costs, settlements, and meal analytics",
      href: "/admin/reports/mess",
      icon: UtensilsCrossed,
      color: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-600",
      borderColor: "border-amber-500/20",
      metric: null,
      metricLabel: "View Details",
      metricSub: "Session-wise breakdown",
    },
    {
      title: "Student Report",
      description: "Full student roster with hostel assignments and transfers",
      href: "/admin/reports/students",
      icon: Users,
      color: "from-violet-500/20 to-purple-500/20",
      iconColor: "text-violet-600",
      borderColor: "border-violet-500/20",
      metric: null,
      metricLabel: "View Roster",
      metricSub: "Export to CSV available",
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive insights across occupancy, payments, mess, and students.
        </p>
      </div>

      {/* Quick Stats Bar */}
      {!loading && (occupancy || payments) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {occupancy && (
            <>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Beds</p>
                <p className="text-2xl font-bold mt-1">{occupancy.totalBeds}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Occupied</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold">{occupancy.occupiedBeds}</p>
                  <span className="text-xs text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-medium">
                    {occupancy.occupancyPercent}%
                  </span>
                </div>
              </div>
            </>
          )}
          {payments && (
            <>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Collected</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">
                  ₹{Number(payments.totalReceived).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold text-destructive">
                    ₹{Number(payments.totalOverdue).toLocaleString("en-IN")}
                  </p>
                  {payments.overdueCount > 0 && (
                    <span className="text-xs text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full font-medium">
                      {payments.overdueCount} students
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
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <Link key={report.href} href={report.href} className="group">
              <Card className={`h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${report.borderColor} overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${report.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${report.color}`}>
                        <report.icon className={`w-5 h-5 ${report.iconColor}`} />
                      </div>
                      {report.title}
                    </CardTitle>
                    <CardDescription className="text-sm">{report.description}</CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 mt-1" />
                </CardHeader>
                <CardContent className="relative pt-0">
                  {report.metric ? (
                    <div className="pt-2 border-t border-dashed">
                      <p className="text-2xl font-bold tracking-tight mt-2">{report.metric}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {report.metricLabel} · {report.metricSub}
                      </p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-dashed">
                      <p className="text-sm font-medium text-muted-foreground mt-2">{report.metricLabel}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{report.metricSub}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
