import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, BedDouble, CreditCard, BarChart3, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function AdminDashboardPage() {
  const session = await auth();
  
  let data = null;
  let error = null;

  try {
    data = await getDashboardStats();
  } catch (err) {
    console.error("Failed to fetch dashboard stats", err);
    error = "Failed to load dashboard data.";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Welcome back, {session?.user?.username ?? "Admin"}
        </p>
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
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Payment Overview</h3>
                  <p className="text-xs text-slate-400">This month&apos;s collection status</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: "Total Billed", value: data.payments.totalBilled, color: "" },
                  { label: "Collected", value: data.payments.totalCollected, color: "text-green-700" },
                  { label: "Pending", value: data.payments.totalPending, color: "text-amber-700" },
                  { label: "Overdue", value: data.payments.totalOverdue, color: "text-red-600" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="text-sm text-slate-500 font-medium">
                      {item.label}
                    </span>
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
