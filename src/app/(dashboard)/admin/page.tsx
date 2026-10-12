import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/dashboard";
import { getAnnualFinancialReport } from "@/lib/services/reports";
import Link from "next/link";
import {
  Building2,
  Users,
  BedDouble,
  CreditCard,
  BarChart3,
  TrendingUp,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  Receipt,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function AdminDashboardPage() {
  const session = await auth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  let data: any = null;
  let annualData: any = null;
  let error: string | null = null;

  try {
    const [stats, annual] = await Promise.all([
      getDashboardStats(),
      getAnnualFinancialReport(null, currentYear),
    ]);
    data = stats;
    annualData = annual;
  } catch (err) {
    console.error("Failed to fetch dashboard stats", err);
    error = "Failed to load dashboard data.";
  }

  const maxChartValue = annualData
    ? Math.max(
        ...(annualData.months.map((m: any) =>
          Math.max(m.totalBilled, m.totalCollected, m.totalOverdue)
        ) || [1000]),
        1000
      )
    : 1000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Welcome back, {session?.user?.username ?? "Admin"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/reports/payments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            View Full Payment Report
            <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>
      </div>

      {error ? (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-xl text-sm">
          <p>{error}</p>
        </div>
      ) : !data ? (
        <p className="text-center text-slate-400 py-12">No data available.</p>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Total Hostels",
                value: data.stats.totalHostels,
                subtitle: "Active",
                icon: Building2,
                iconBg: "bg-blue-50",
                iconColor: "text-blue-600",
              },
              {
                title: "Total Students",
                value: data.stats.totalStudents,
                subtitle: "Enrolled",
                icon: Users,
                iconBg: "bg-green-50",
                iconColor: "text-green-600",
              },
              {
                title: "Beds Occupied",
                value: data.stats.bedsOccupied,
                subtitle: "Occupancy",
                icon: BedDouble,
                iconBg: "bg-amber-50",
                iconColor: "text-amber-600",
              },
              {
                title: "Pending Payments",
                value: `₹${Number(data.stats.pendingPayments).toLocaleString("en-IN")}`,
                subtitle: "This month",
                icon: CreditCard,
                iconBg: "bg-purple-50",
                iconColor: "text-purple-600",
              },
            ].map((stat) => (
              <div
                key={stat.title}
                className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {stat.title}
                  </span>
                  <div className={`w-8 h-8 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.subtitle}
                </p>
              </div>
            ))}
          </div>

          {/* Monthly Revenue & Overdue Trends Card */}
          {annualData && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Annual Revenue & Overdue Performance ({currentYear})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Month-by-month revenue collection vs overdue balances across all hostels
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                      <span className="text-slate-600 font-medium">Revenue</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                      <span className="text-slate-600 font-medium">Overdue</span>
                    </span>
                  </div>
                  <Link
                    href="/admin/reports/payments"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View All 12 Months
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* KPI Mini-bar row */}
              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 border-b border-slate-100">
                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                    Annual Revenue Collected
                  </p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">
                    ₹{annualData.summary.totalRevenue.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {annualData.summary.collectionRate}% collection rate
                  </p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                    Total Overdue
                  </p>
                  <p className="text-xl font-bold text-rose-600 mt-1">
                    ₹{annualData.summary.totalOverdue.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {annualData.summary.totalOverdueCount} students with overdue bills
                  </p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Billed ({currentYear})
                  </p>
                  <p className="text-xl font-bold text-slate-800 mt-1">
                    ₹{annualData.summary.totalBilled.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {annualData.summary.totalBills} bills generated
                  </p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                    Pending Collection
                  </p>
                  <p className="text-xl font-bold text-amber-600 mt-1">
                    ₹{annualData.summary.totalPending.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Awaiting payment</p>
                </div>
              </div>

              {/* Monthly Visual Bar Matrix */}
              <div className="p-5">
                <div className="grid grid-cols-12 gap-1 sm:gap-2 pt-2 items-end min-h-[140px]">
                  {annualData.months.map((m: any) => {
                    const revenueHeight = Math.max(
                      3,
                      Math.round((m.totalCollected / maxChartValue) * 100)
                    );
                    const overdueHeight = Math.max(
                      m.totalOverdue > 0 ? 3 : 0,
                      Math.round((m.totalOverdue / maxChartValue) * 100)
                    );
                    const isCurrent = m.month === currentMonth;

                    return (
                      <Link
                        key={m.month}
                        href="/admin/reports/payments"
                        className={`group flex flex-col items-center p-1 rounded-lg transition-colors ${
                          isCurrent ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="w-full flex items-end justify-center gap-1 h-[105px] pb-1">
                          {/* Revenue */}
                          <div
                            style={{ height: `${revenueHeight}px` }}
                            className={`w-2 sm:w-3.5 rounded-t ${
                              m.totalCollected > 0 ? "bg-emerald-500" : "bg-slate-100"
                            }`}
                            title={`${m.monthName}: ₹${m.totalCollected.toLocaleString("en-IN")} Collected`}
                          />
                          {/* Overdue */}
                          <div
                            style={{ height: `${overdueHeight}px` }}
                            className={`w-2 sm:w-3.5 rounded-t ${
                              m.totalOverdue > 0 ? "bg-rose-500" : "bg-slate-100"
                            }`}
                            title={`${m.monthName}: ₹${m.totalOverdue.toLocaleString("en-IN")} Overdue`}
                          />
                        </div>
                        <span
                          className={`text-[11px] font-semibold block pt-1 border-t border-slate-100 w-full text-center ${
                            isCurrent ? "text-blue-600" : "text-slate-600"
                          }`}
                        >
                          {m.monthShort}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Detailed sections */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Recent Activity</h3>
                  <p className="text-xs text-slate-400">Latest system events</p>
                </div>
              </div>
              <div className="p-5">
                {data.recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                      <BarChart3 className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-400">No recent activity found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.recentActivity.map((activity: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{activity.text}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Overview */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Current Month Status</h3>
                    <p className="text-xs text-slate-400">This month&apos;s billing breakdown</p>
                  </div>
                </div>
                <Link
                  href="/admin/reports/payments"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Details →
                </Link>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: "Total Billed", value: data.payments.totalBilled, color: "" },
                  { label: "Collected", value: data.payments.totalCollected, color: "text-green-700" },
                  { label: "Pending", value: data.payments.totalPending, color: "text-amber-700" },
                  { label: "Overdue", value: data.payments.totalOverdue, color: "text-red-600" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                  >
                    <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                    <span className={`text-sm font-bold ${item.color || "text-slate-800"}`}>
                      ₹{Number(item.value).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
