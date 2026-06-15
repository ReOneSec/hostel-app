"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Users, Loader2, Download, Search } from "lucide-react";
import { format } from "date-fns";

export default function StudentsReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostel, setSelectedHostel] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/hostels").then(r => r.json()).then(j => {
      if (j.success) setHostels(j.data || []);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedHostel, selectedStatus]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedHostel) params.set("hostelId", selectedHostel);
      if (selectedStatus) params.set("status", selectedStatus);
      const res = await fetch(`/api/reports/students?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!data?.students) return;

    const headers = ["Name", "Email", "Personal Email", "Mobile", "Status", "Hostel", "Room", "Bed", "Joined", "Transfers"];
    const rows = filteredStudents.map((s: any) => [
      s.name,
      s.email,
      s.personalEmail || "",
      s.mobile || "",
      s.status,
      s.hostel,
      s.room,
      s.bed,
      format(new Date(s.joinedAt), "yyyy-MM-dd"),
      s.transferCount,
    ]);

    const csv = [headers.join(","), ...rows.map((r: any[]) => r.map((v: any) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredStudents = (data?.students || []).filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.hostel.toLowerCase().includes(search.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold tracking-tight">Student Report</h1>
            <p className="text-muted-foreground mt-0.5">Full roster with assignments and transfers</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!data?.students?.length}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, hostel..."
            className="pl-8 w-full sm:w-[280px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          value={selectedHostel}
          onChange={(e) => setSelectedHostel(e.target.value)}
        >
          <option value="">All Hostels</option>
          {hostels.map((h: any) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-3xl font-bold mt-1">{data.summary.totalStudents}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
                <p className="text-3xl font-bold mt-1 text-emerald-600">{data.summary.activeStudents}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inactive</p>
                <p className="text-3xl font-bold mt-1 text-muted-foreground">{data.summary.inactiveStudents}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unassigned</p>
                <p className="text-3xl font-bold mt-1 text-amber-600">{data.summary.unassigned}</p>
              </CardContent>
            </Card>
          </div>

          {/* Student Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  Students ({filteredStudents.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No students found matching your filters.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Hostel</TableHead>
                        <TableHead className="text-center">Room</TableHead>
                        <TableHead className="text-center">Bed</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-center">Transfers</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{s.email}</TableCell>
                          <TableCell>
                            {s.hostel === "Unassigned" ? (
                              <span className="text-amber-600 text-sm">Unassigned</span>
                            ) : (
                              <span className="text-sm">{s.hostel}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm">{s.room}</TableCell>
                          <TableCell className="text-center text-sm">{s.bed}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(s.joinedAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-center">
                            {s.transferCount > 0 ? (
                              <Badge variant="secondary" className="text-xs">{s.transferCount}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={s.status === "ACTIVE" ? "outline" : "secondary"}
                              className={s.status === "ACTIVE" ? "border-emerald-500/30 text-emerald-600" : "text-muted-foreground"}
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
