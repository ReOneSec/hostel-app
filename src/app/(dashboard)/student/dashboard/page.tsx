"use client";

import { useSession } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Home,
  Receipt,
  UtensilsCrossed,
  FileText,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/users/me`)
        .then((res) => res.json())
        .then((json) => {
          setUserData(json.data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch user data", err);
          setIsLoading(false);
        });
    }
  }, [session?.user?.id]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {session?.user?.username ?? "Student"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your hostel overview
        </p>
      </div>

      {/* Hostel Info Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Current Accommodation
              </p>
              {isLoading ? (
                <p className="text-lg font-semibold mt-0.5 animate-pulse">Loading...</p>
              ) : userData?.hostelAssignments?.length > 0 ? (
                <>
                  <p className="text-lg font-semibold mt-0.5">
                    {userData.hostelAssignments[0].hostel.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {userData.roomAssignments?.length > 0 
                        ? `Room ${userData.roomAssignments[0].room.roomNumber}` 
                        : 'No Room'}
                    </Badge>
                    <Badge variant="outline">
                      {userData.bedAssignments?.length > 0 
                        ? `Bed ${userData.bedAssignments[0].bed.bedLabel}` 
                        : 'No Bed'}
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold mt-0.5">
                    Not yet assigned
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">No Room</Badge>
                    <Badge variant="outline">No Bed</Badge>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/student/profile" className="block">
          <Card className="border-border/50 hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
              >
                Complete ✓
              </Badge>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-border/50 hover:shadow-md transition-all hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">0 uploaded</p>
            <p className="text-xs text-muted-foreground">0 verified</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              Current Bill
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">₹0</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> No bills yet
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-purple-500" />
              Mess
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">—</p>
            <p className="text-xs text-muted-foreground">
              No active session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              label: "View Bills",
              href: "/student/bills",
              icon: Receipt,
              desc: "See your monthly bill breakdown",
            },
            {
              label: "Upload Payment",
              href: "/student/payments",
              icon: CreditCard,
              desc: "Submit payment proof for verification",
            },
            {
              label: "Mess Settlement",
              href: "/student/mess",
              icon: UtensilsCrossed,
              desc: "View mess contributions and meals",
            },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <action.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {action.desc}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Getting Started
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your dashboard will show live data once you are assigned to a
              hostel and bills are generated. Contact your hostel manager for
              assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
