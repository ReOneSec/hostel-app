"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Users, Loader2, Download, Search, Activity, Archive, BedDouble } from "lucide-react";
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
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/reports">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg shrink-0 text-slate-500 hover:text-slate-900 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Full roster with assignments and transfers</p>
          </div>
        </div>
        <Button 
          onClick={exportCSV} 
          disabled={!data?.students?.length}
          className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm rounded-lg cursor-pointer shadow-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-400 mt-3">Loading student data…</p>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-slate-500">Failed to load data.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</p>
                <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{data.summary.totalStudents}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</p>
                <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-700">{data.summary.activeStudents}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inactive</p>
                <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                  <Archive className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-700">{data.summary.inactiveStudents}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unassigned</p>
                <div className="w-6 h-6 rounded bg-amber-50 flex items-center justify-center">
                  <BedDouble className="w-3.5 h-3.5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-700">{data.summary.unassigned}</p>
            </div>
          </div>

          {/* Student Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Student Roster</h3>
                  <p className="text-xs text-slate-400">{filteredStudents.length} students found</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, email..."
                    className="pl-9 h-9 border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={selectedHostel} onValueChange={(val) => setSelectedHostel(val || "all")}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white">
                    <SelectValue placeholder="All Hostels">
                      {selectedHostel === "all" ? "All Hostels" : hostels.find((h: any) => h.id === selectedHostel)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hostels</SelectItem>
                    {hostels.map((h: any) => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || "all")}>
                  <SelectTrigger className="w-full sm:w-[130px] h-9 border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white">
                    <SelectValue placeholder="All Status">
                      {selectedStatus === "all" ? "All Statuses" : selectedStatus === "ACTIVE" ? "Active" : selectedStatus === "INACTIVE" ? "Inactive" : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <>
              {filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">No students found</h3>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Try adjusting your filters or search terms.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name / Email</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hostel</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Room</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Bed</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Transfers</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Status</span>
                    </div>
                    
                    {filteredStudents.map((s: any) => (
                      <div key={s.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5" title={s.email}>{s.email}</p>
                        </div>
                        <div className="truncate pr-4">
                          {s.hostel === "Unassigned" ? (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Unassigned</span>
                          ) : (
                            <span className="text-sm text-slate-700 truncate">{s.hostel}</span>
                          )}
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-slate-700">{s.room || "-"}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-slate-700">{s.bed || "-"}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-600">{format(new Date(s.joinedAt), "MMM d, yy")}</span>
                        </div>
                        <div className="text-center">
                          {s.transferCount > 0 ? (
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{s.transferCount}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                        <div className="text-right flex justify-end">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${
                            s.status === "ACTIVE" 
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden p-4 space-y-3">
                    {filteredStudents.map((s: any) => (
                      <div key={s.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 pr-3">
                            <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{s.email}</p>
                          </div>
                          <div className="shrink-0">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${
                              s.status === "ACTIVE" 
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              {s.status}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Hostel</span>
                            {s.hostel === "Unassigned" ? (
                              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Unassigned</span>
                            ) : (
                              <span className="text-sm font-medium text-slate-700">{s.hostel}</span>
                            )}
                          </div>
                          {(s.room || s.bed) && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">Room / Bed</span>
                              <span className="text-sm text-slate-700">{s.room || "-"} / {s.bed || "-"}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Joined</span>
                            <span className="text-sm text-slate-700">{format(new Date(s.joinedAt), "MMM d, yy")}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Transfers</span>
                            <span className="text-sm text-slate-700">{s.transferCount || "0"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          </div>
        </>
      )}
    </div>
  );
}

