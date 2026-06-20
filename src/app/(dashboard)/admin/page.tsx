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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.user?.username ?? "Admin"}
        </p>
      </div>

      {error ? (
        <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg">
          <p>{error}</p>
        </div>
      ) : !data ? (
        <p className="text-center text-muted-foreground py-12">No data available.</p>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Total Hostels",
                value: data.stats.totalHostels,
                change: "Active",
                icon: Building2,
                color: "text-blue-500",
                bgColor: "bg-blue-500/10",
              },
              {
                title: "Total Students",
                value: data.stats.totalStudents,
                change: "Enrolled",
                icon: Users,
                color: "text-emerald-500",
                bgColor: "bg-emerald-500/10",
              },
              {
                title: "Beds Occupied",
                value: data.stats.bedsOccupied,
                change: "Occupancy",
                icon: BedDouble,
                color: "text-amber-500",
                bgColor: "bg-amber-500/10",
              },
              {
                title: "Pending Payments",
                value: `₹${Number(data.stats.pendingPayments).toLocaleString("en-IN")}`,
                change: "This month",
                icon: CreditCard,
                color: "text-purple-500",
                bgColor: "bg-purple-500/10",
              },
            ].map((stat) => (
              <Card
                key={stat.title}
                className="border-border/50 hover:shadow-md transition-shadow"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed sections */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest system events</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    No recent activity found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.recentActivity.map((activity: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-3 rounded-lg border bg-card/50 shadow-sm"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.text}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payment Overview
                </CardTitle>
                <CardDescription>This month&apos;s collection status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Total Billed", value: data.payments.totalBilled },
                    { label: "Collected", value: data.payments.totalCollected },
                    { label: "Pending", value: data.payments.totalPending },
                    { label: "Overdue", value: data.payments.totalOverdue },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center p-3 rounded-lg border bg-card/50">
                      <span className="text-sm text-muted-foreground font-medium">
                        {item.label}
                      </span>
                      <span className={`text-sm font-bold ${
                        item.label === 'Collected' ? 'text-emerald-600' :
                        item.label === 'Pending' ? 'text-amber-600' :
                        item.label === 'Overdue' ? 'text-destructive' : ''
                      }`}>
                        ₹{Number(item.value).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
