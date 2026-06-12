"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Receipt, Settings, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function AdminBillingPage() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [configData, setConfigData] = useState<any>(null);
  
  // Form States
  const [rentAmount, setRentAmount] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [estFeeAmount, setEstFeeAmount] = useState("");
  const [bedFeeAmount, setBedFeeAmount] = useState("");
  const [selectedBedLevel, setSelectedBedLevel] = useState("hostel"); // hostel, room, bed
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    if (selectedHostel) {
      fetchConfig();
    } else {
      setConfigData(null);
    }
  }, [selectedHostel]);

  async function fetchHostels() {
    try {
      const res = await fetch("/api/hostels");
      if (!res.ok) throw new Error("Failed to fetch hostels");
      const { data } = await res.json();
      setHostels(data || []);
      if (data && data.length > 0) {
        setSelectedHostel(data[0].id);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("Failed to load hostels");
      setIsLoading(false);
    }
  }

  async function fetchConfig() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/billing/config?hostelId=${selectedHostel}`);
      if (!res.ok) throw new Error("Failed to fetch config");
      const { data } = await res.json();
      setConfigData(data);
      
      // Pre-fill forms if data exists
      if (data.establishmentFees?.[0]) {
        setEstFeeAmount(data.establishmentFees[0].amount.toString());
      } else {
        setEstFeeAmount("");
      }
      
    } catch (error) {
      toast.error("Failed to load billing configuration");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetRent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !rentAmount) return toast.error("Please fill all fields");
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/billing/config/rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          hostelId: selectedHostel,
          amount: parseFloat(rentAmount),
        }),
      });
      if (!res.ok) throw new Error("Failed to set rent");
      toast.success("Rent configured successfully");
      setRentAmount("");
      setSelectedStudent("");
      fetchConfig();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetEstFee(e: React.FormEvent) {
    e.preventDefault();
    if (!estFeeAmount) return toast.error("Please enter an amount");
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/billing/config/establishment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: selectedHostel,
          amount: parseFloat(estFeeAmount),
        }),
      });
      if (!res.ok) throw new Error("Failed to set establishment fee");
      toast.success("Establishment fee configured successfully");
      fetchConfig();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetBedFee(e: React.FormEvent) {
    e.preventDefault();
    if (!bedFeeAmount) return toast.error("Please enter an amount");
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/billing/config/bed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: selectedHostel,
          roomId: selectedBedLevel === "room" || selectedBedLevel === "bed" ? selectedRoomId : null,
          bedId: selectedBedLevel === "bed" ? selectedBedId : null,
          amount: parseFloat(bedFeeAmount),
        }),
      });
      if (!res.ok) throw new Error("Failed to set bed fee");
      toast.success("Bed fee configured successfully");
      setBedFeeAmount("");
      fetchConfig();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateBills() {
    if (!confirm("Are you sure you want to generate bills for all active students for this month?")) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/billing/generate", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.data?.message || "Bills generated successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading && !hostels.length) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Fees</h1>
          <p className="text-muted-foreground mt-1">
            Configure hostel fees and generate monthly bills.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleGenerateBills} 
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}
            Generate Bills (Test)
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Label className="text-muted-foreground shrink-0">Select Hostel:</Label>
        <Select value={selectedHostel} onValueChange={(val) => setSelectedHostel(val || "")}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a hostel" />
          </SelectTrigger>
          <SelectContent>
            {hostels.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isLoading && configData ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rent">Rent Config</TabsTrigger>
            <TabsTrigger value="establishment">Est. Fee</TabsTrigger>
            <TabsTrigger value="bed">Bed Fee</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-lg">Active Configuration</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Establishment Fee</span>
                    <span className="font-medium">
                      {configData.establishmentFees?.[0] ? `₹${configData.establishmentFees[0].amount}` : "Not Set"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Bed Fees Configured</span>
                    <span className="font-medium">{configData.bedFees?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Students w/ Custom Rent</span>
                    <span className="font-medium">{configData.rentConfigs?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rent" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configure Student Rent</CardTitle>
                <CardDescription>Set the base rent amount for specific students.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetRent} className="flex flex-col sm:flex-row items-end gap-4 max-w-3xl mb-8">
                  <div className="space-y-2 flex-1">
                    <Label>Student</Label>
                    <Select value={selectedStudent} onValueChange={(val) => setSelectedStudent(val || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {configData.activeStudents?.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.studentProfile?.fullName || s.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 w-full sm:w-48">
                    <Label>Rent Amount (₹)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={rentAmount} 
                      onChange={(e) => setRentAmount(e.target.value)} 
                      placeholder="e.g. 5000" 
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set Rent"}
                  </Button>
                </form>

                <div className="rounded-md border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium">Student Name</th>
                        <th className="px-4 py-3 font-medium">Current Rent</th>
                        <th className="px-4 py-3 font-medium">Effective From</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configData.rentConfigs?.length > 0 ? (
                        configData.rentConfigs.map((rc: any) => (
                          <tr key={rc.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{rc.user?.studentProfile?.fullName || rc.user?.username}</td>
                            <td className="px-4 py-3">₹{parseFloat(rc.amount).toFixed(2)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{format(new Date(rc.effectiveFrom), "MMM d, yyyy")}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                            No custom rent configured.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="establishment" className="mt-6">
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Establishment Fee</CardTitle>
                <CardDescription>Set the base establishment fee applied to all students in this hostel.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetEstFee} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fee Amount (₹)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={estFeeAmount} 
                      onChange={(e) => setEstFeeAmount(e.target.value)} 
                      placeholder="e.g. 1500" 
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Configuration"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Bed Fees</CardTitle>
                <CardDescription>Configure extra fees based on room or specific bed.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetBedFee} className="space-y-4 max-w-2xl mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fee Level</Label>
                      <Select value={selectedBedLevel} onValueChange={(val) => setSelectedBedLevel(val || "")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hostel">All Beds in Hostel</SelectItem>
                          <SelectItem value="room">Specific Room</SelectItem>
                          <SelectItem value="bed">Specific Bed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(selectedBedLevel === "room" || selectedBedLevel === "bed") && (
                      <div className="space-y-2">
                        <Label>Room</Label>
                        <Select value={selectedRoomId} onValueChange={(val) => setSelectedRoomId(val || "")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Room" />
                          </SelectTrigger>
                          <SelectContent>
                            {configData.rooms?.map((r: any) => (
                              <SelectItem key={r.id} value={r.id}>Room {r.roomNumber}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedBedLevel === "bed" && selectedRoomId && (
                      <div className="space-y-2">
                        <Label>Bed</Label>
                        <Select value={selectedBedId} onValueChange={(val) => setSelectedBedId(val || "")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Bed" />
                          </SelectTrigger>
                          <SelectContent>
                            {configData.rooms?.find((r: any) => r.id === selectedRoomId)?.beds.map((b: any) => (
                              <SelectItem key={b.id} value={b.id}>Bed {b.bedLabel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Fee Amount (₹)</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={bedFeeAmount} 
                        onChange={(e) => setBedFeeAmount(e.target.value)} 
                        placeholder="e.g. 500" 
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Add Bed Fee"}
                  </Button>
                </form>

                <div className="rounded-md border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium">Level</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Effective From</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configData.bedFees?.length > 0 ? (
                        configData.bedFees.map((f: any) => (
                          <tr key={f.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">
                              {f.bedId ? `Room ${f.room?.roomNumber} - Bed ${f.bed?.bedLabel}` : f.roomId ? `Room ${f.room?.roomNumber} (All Beds)` : "All Hostel Beds"}
                            </td>
                            <td className="px-4 py-3">₹{parseFloat(f.amount).toFixed(2)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{format(new Date(f.effectiveFrom), "MMM d, yyyy")}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                            No bed fees configured.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
