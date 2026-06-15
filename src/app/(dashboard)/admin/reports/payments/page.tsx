"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, CreditCard, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function PaymentsReportPage() {
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
      const res = await fetch(`/api/reports/payments?${params}`);
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
            <h1 className="text-3xl font-bold tracking-tight">Payment Report</h1>
            <p className="text-muted-foreground mt-0.5">Collection and overdue tracking</p>
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
      ) : !data ? (
        <p className="text-center text-muted-foreground py-12">Failed to load data.</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Billed</p>
                <p className="text-2xl font-bold mt-1">₹{Number(data.summary.totalBilled).toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.summary.totalBills} bills</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Collected</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">₹{Number(data.summary.totalReceived).toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.summary.totalBilled > 0 ? Math.round((data.summary.totalReceived / data.summary.totalBilled) * 100) : 0}% collected
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">₹{Number(data.summary.totalPending).toLocaleString("en-IN")}</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
                <p className="text-2xl font-bold mt-1 text-destructive">₹{Number(data.summary.totalOverdue).toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.summary.overdueCount} students</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(data.statusBreakdown).map(([status, info]: [string, any]) => (
                  <div key={status} className="p-4 rounded-xl border bg-muted/20">
                    <Badge variant={
                      status === "PAID" ? "outline" :
                      status === "OVERDUE" ? "destructive" :
                      "secondary"
                    } className="mb-2">
                      {status.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-xl font-bold">{info.count}</p>
                    <p className="text-xs text-muted-foreground">₹{Number(info.amount).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overdue Students */}
          {data.overdueStudents.length > 0 && (
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue Students ({data.overdueStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-destructive/5">
                        <TableHead>Student</TableHead>
                        <TableHead>Hostel</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Overdue</TableHead>
                        <TableHead className="text-right">Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.overdueStudents.map((s: any) => (
                        <TableRow key={s.userId}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{s.hostel}</TableCell>
                          <TableCell className="text-right">₹{Number(s.totalAmount).toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right text-emerald-600">₹{Number(s.paidAmount).toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right font-semibold text-destructive">₹{Number(s.overdueAmount).toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {format(new Date(s.dueDate), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
