"use client";

import { useSession } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, BedDouble, CreditCard, BarChart3, TrendingUp } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.user?.username ?? "Admin"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Hostels",
            value: "—",
            change: "Active",
            icon: Building2,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
          },
          {
            title: "Total Students",
            value: "—",
            change: "Enrolled",
            icon: Users,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
          },
          {
            title: "Beds Occupied",
            value: "—",
            change: "Occupancy",
            icon: BedDouble,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
          },
          {
            title: "Pending Payments",
            value: "—",
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

      {/* Placeholder sections */}
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse mt-2" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Activity data will populate once the system is connected to a database.
            </p>
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
              {["Total Billed", "Collected", "Pending", "Overdue"].map(
                (label) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm font-medium">₹—</span>
                  </div>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Connect to database to see live data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
