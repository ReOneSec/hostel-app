"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Loader2, BedDouble, CheckCircle2, AlertTriangle, Users } from "lucide-react";

export default function OccupancyReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHostel, setSelectedHostel] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/occupancy");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-400 mt-3">Loading occupancy data…</p>
      </div>
    );
  }

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-sm text-slate-500">Failed to load data.</p>
    </div>
  );

  const displayHostels = selectedHostel
    ? data.hostels.filter((h: any) => h.hostelId === selectedHostel)
    : data.hostels;

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Occupancy Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Bed utilization across hostels</p>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setSelectedHostel(null)}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
            selectedHostel === null 
              ? "bg-slate-900 text-white shadow-sm" 
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          All Hostels
        </button>
        {data.hostels.map((h: any) => (
          <button
            key={h.hostelId}
            onClick={() => setSelectedHostel(h.hostelId)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ml-1 ${
              selectedHostel === h.hostelId 
                ? "bg-slate-900 text-white shadow-sm" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {h.hostelName}
          </button>
        ))}
      </div>

      {/* Overall Summary */}
      {!selectedHostel && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Beds</p>
              <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                <BedDouble className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{data.totals.totalBeds}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupied</p>
              <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-700">{data.totals.occupiedBeds}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 ring-1 ring-slate-200/80">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vacant</p>
              <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-700">{data.totals.vacantBeds}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5 ring-1 ring-indigo-200/80 bg-indigo-50/20">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Occupancy Rate</p>
              <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-indigo-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-indigo-700">{data.totals.occupancyPercent}%</p>
              <span className="text-xs text-indigo-500/80 font-medium">filled</span>
            </div>
          </div>
        </div>
      )}

      {/* Per-Hostel Cards */}
      <div className="space-y-6">
        {displayHostels.map((hostel: any) => (
          <div key={hostel.hostelId} className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{hostel.hostelName}</h3>
                  <p className="text-xs text-slate-500">{hostel.rooms.length} rooms configured</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Capacity</p>
                  <p className="text-sm font-bold text-slate-800">{hostel.occupiedBeds} <span className="text-slate-400 font-normal">/ {hostel.totalBeds}</span></p>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="flex items-center gap-3 w-32">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        hostel.occupancyPercent >= 90
                          ? "bg-red-500"
                          : hostel.occupancyPercent >= 70
                          ? "bg-amber-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${hostel.occupancyPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-8">{hostel.occupancyPercent}%</span>
                </div>
              </div>
            </div>
            
            <div className="p-0">
              {hostel.rooms.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400">No rooms configured in this hostel.</div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-slate-100 bg-white">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Room</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Total Beds</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Occupied</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Vacant</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Status</span>
                    </div>
                    
                    {hostel.rooms.map((room: any) => (
                      <div key={room.roomId} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors items-center">
                        <span className="text-sm font-medium text-slate-800">Room {room.roomNumber}</span>
                        <span className="text-xs text-slate-500 capitalize">{room.roomType || "Standard"}</span>
                        <span className="text-sm font-medium text-slate-700 text-center">{room.totalBeds}</span>
                        <span className="text-sm font-semibold text-slate-900 text-center">{room.occupiedBeds}</span>
                        <span className="text-sm font-medium text-slate-600 text-center">{room.vacantBeds}</span>
                        <div className="flex justify-end">
                          {room.vacantBeds === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider bg-red-50 text-red-700 border-red-200">Full</span>
                          ) : room.occupiedBeds === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider bg-green-50 text-green-700 border-green-200">Empty</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200">Partial</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden p-4 space-y-3">
                    {hostel.rooms.map((room: any) => (
                      <div key={room.roomId} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">Room {room.roomNumber}</p>
                            <p className="text-xs text-slate-400 capitalize">{room.roomType || "Standard"}</p>
                          </div>
                          {room.vacantBeds === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider bg-red-50 text-red-700 border-red-200">Full</span>
                          ) : room.occupiedBeds === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider bg-green-50 text-green-700 border-green-200">Empty</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider bg-amber-50 text-amber-700 border-amber-200">Partial</span>
                          )}
                        </div>
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Total Beds</span>
                            <span className="text-sm font-medium text-slate-700">{room.totalBeds}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Occupied</span>
                            <span className="text-sm font-semibold text-slate-900">{room.occupiedBeds}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Vacant</span>
                            <span className="text-sm font-medium text-slate-600">{room.vacantBeds}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {displayHostels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No hostels found</h3>
          <p className="text-xs text-slate-500">There is no occupancy data available.</p>
        </div>
      )}
    </div>
  );
}

