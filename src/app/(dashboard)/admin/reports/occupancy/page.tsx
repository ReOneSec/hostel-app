"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";

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
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return <p className="text-center text-muted-foreground py-12">Failed to load data.</p>;

  const displayHostels = selectedHostel
    ? data.hostels.filter((h: any) => h.hostelId === selectedHostel)
    : data.hostels;

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
            <h1 className="text-3xl font-bold tracking-tight">Occupancy Report</h1>
            <p className="text-muted-foreground mt-0.5">Bed utilization across hostels</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={selectedHostel === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedHostel(null)}
          >
            All Hostels
          </Button>
          {data.hostels.map((h: any) => (
            <Button
              key={h.hostelId}
              variant={selectedHostel === h.hostelId ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedHostel(h.hostelId)}
            >
              {h.hostelName}
            </Button>
          ))}
        </div>
      </div>

      {/* Overall Summary */}
      {!selectedHostel && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Beds</p>
              <p className="text-3xl font-bold mt-1">{data.totals.totalBeds}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Occupied</p>
              <p className="text-3xl font-bold mt-1 text-emerald-600">{data.totals.occupiedBeds}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vacant</p>
              <p className="text-3xl font-bold mt-1">{data.totals.vacantBeds}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20">
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Occupancy Rate</p>
              <p className="text-3xl font-bold mt-1 text-blue-600">{data.totals.occupancyPercent}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Per-Hostel Cards */}
      {displayHostels.map((hostel: any) => (
        <Card key={hostel.hostelId}>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2.5 text-lg">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                {hostel.hostelName}
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {hostel.occupiedBeds}/{hostel.totalBeds} beds
                </Badge>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        hostel.occupancyPercent >= 90
                          ? "bg-destructive"
                          : hostel.occupancyPercent >= 70
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${hostel.occupancyPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{hostel.occupancyPercent}%</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hostel.rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No rooms configured.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Room</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Total Beds</TableHead>
                      <TableHead className="text-center">Occupied</TableHead>
                      <TableHead className="text-center">Vacant</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hostel.rooms.map((room: any) => (
                      <TableRow key={room.roomId}>
                        <TableCell className="font-medium">Room {room.roomNumber}</TableCell>
                        <TableCell className="text-muted-foreground capitalize">{room.roomType || "Standard"}</TableCell>
                        <TableCell className="text-center">{room.totalBeds}</TableCell>
                        <TableCell className="text-center font-medium">{room.occupiedBeds}</TableCell>
                        <TableCell className="text-center">{room.vacantBeds}</TableCell>
                        <TableCell className="text-right">
                          {room.vacantBeds === 0 ? (
                            <Badge variant="destructive" className="text-xs">Full</Badge>
                          ) : room.occupiedBeds === 0 ? (
                            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600">Empty</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Partial</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {displayHostels.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No hostels found.</p>
        </div>
      )}
    </div>
  );
}
