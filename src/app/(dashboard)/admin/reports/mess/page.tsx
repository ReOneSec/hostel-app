"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, UtensilsCrossed, Loader2 } from "lucide-react";

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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/reports">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mess Report</h1>
            <p className="text-muted-foreground mt-0.5">Session costs, settlements, and meal analytics</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 border rounded-lg p-1">
          {months.map((m, i) => (
            <Button
              key={m}
              variant={month === i + 1 ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setMonth(i + 1)}
            >
              {m}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          {[year - 1, year, year + 1].map((y) => (
            <Button
              key={y}
              variant={year === y ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setYear(y)}
            >
              {y}
            </Button>
          ))}
        </div>
        <select
          className="h-8 rounded-lg border bg-background px-3 text-sm"
          value={selectedHostel}
          onChange={(e) => setSelectedHostel(e.target.value)}
        >
          <option value="">All Hostels</option>
          {hostels.map((h: any) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.sessions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">No mess sessions found</p>
          <p className="text-sm mt-1">for {months[month - 1]} {year}</p>
        </div>
      ) : (
        <>
          {data.sessions.map((session: any) => (
            <Card key={session.sessionId} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/5 to-orange-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                      </div>
                      {session.hostelName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {months[session.month - 1]} {session.year} · {session.studentCount} students
                    </CardDescription>
                  </div>
                  <Badge
                    variant={session.status === "CLOSED" ? "outline" : "secondary"}
                    className={session.status === "CLOSED" ? "border-emerald-500/30 text-emerald-600" : ""}
                  >
                    {session.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Meal Charge</p>
                    <p className="text-xl font-bold mt-1">
                      {session.universalMealCharge != null
                        ? `₹${session.universalMealCharge.toFixed(2)}`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">per meal</p>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Mess Cost</p>
                    <p className="text-xl font-bold mt-1">₹{Number(session.totalMessCost).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Guest Recovery</p>
                    <p className="text-xl font-bold mt-1 text-emerald-600">₹{Number(session.guestRecovery).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">{session.totalGuestMeals} guest meals</p>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Meals</p>
                    <p className="text-xl font-bold mt-1">{session.totalStudentMeals}</p>
                    <p className="text-xs text-muted-foreground">student meals</p>
                  </div>
                </div>

                {/* Expense Breakdown */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Market Expenses</p>
                    <p className="text-lg font-semibold">₹{Number(session.totalMarketExpenses).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Water Expenses</p>
                    <p className="text-lg font-semibold">₹{Number(session.totalWaterExpenses).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* Settlement Table */}
                {session.status === "CLOSED" && session.settlements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Settlement Summary</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Student</TableHead>
                            <TableHead className="text-center">Meals</TableHead>
                            <TableHead className="text-right">Meal Cost</TableHead>
                            <TableHead className="text-right">Contributed</TableHead>
                            <TableHead className="text-right">Liability</TableHead>
                            <TableHead className="text-right">Settlement</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {session.settlements.map((st: any) => (
                            <TableRow key={st.userId}>
                              <TableCell className="font-medium">{st.name}</TableCell>
                              <TableCell className="text-center">{st.mealCount}</TableCell>
                              <TableCell className="text-right">₹{st.mealCost.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-emerald-600">₹{st.totalContribution.toFixed(2)}</TableCell>
                              <TableCell className="text-right">₹{st.totalLiability.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <span className={`font-semibold ${st.netSettlement >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                                  {st.netSettlement >= 0 ? "+" : ""}₹{st.netSettlement.toFixed(2)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
