"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Receipt, Settings, CreditCard, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function AdminBillingClient({
  initialHostels,
  initialConfigData,
  initialRegisterData,
  initialYear,
}: {
  initialHostels: any[];
  initialConfigData: any | null;
  initialRegisterData: any[];
  initialYear: string;
}) {
  const [hostels, setHostels] = useState<any[]>(initialHostels);
  const [selectedHostel, setSelectedHostel] = useState<string>(initialHostels[0]?.id || "");
  const [isLoading, setIsLoading] = useState(!initialConfigData);
  const [configData, setConfigData] = useState<any>(initialConfigData);
  
  // Register Data
  const [registerData, setRegisterData] = useState<any[]>(initialRegisterData);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  
  // Form States
  const [rentAmount, setRentAmount] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [estFeeAmount, setEstFeeAmount] = useState(initialConfigData?.establishmentFees?.[0]?.amount?.toString() || "");
  const [bedFeeAmount, setBedFeeAmount] = useState("");
  const [selectedBedLevel, setSelectedBedLevel] = useState("hostel"); // hostel, room, bed
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  
  // Student Edit States
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editRent, setEditRent] = useState("");
  const [editBedFee, setEditBedFee] = useState("");
  const [editEstFee, setEditEstFee] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!selectedHostel) {
      setConfigData(null);
      setRegisterData([]);
      return;
    }

    if (selectedHostel === initialHostels[0]?.id && initialConfigData) {
      setConfigData(initialConfigData);
      setEstFeeAmount(initialConfigData.establishmentFees?.[0]?.amount?.toString() || "");
      setIsLoading(false);
    } else {
      fetchConfig();
    }
  }, [selectedHostel]);

  useEffect(() => {
    if (!selectedHostel) return;
    
    if (selectedHostel === initialHostels[0]?.id && selectedYear === initialYear) {
      setRegisterData(initialRegisterData);
    } else {
      fetchRegisterData();
    }
  }, [selectedHostel, selectedYear]);

  async function fetchRegisterData() {
    setIsRegisterLoading(true);
    try {
      const res = await fetch(`/api/billing/register?hostelId=${selectedHostel}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch register data");
      const { data } = await res.json();
      setRegisterData(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsRegisterLoading(false);
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

  function handleEditStudent(student: any, rent: number, bedFee: number, estFee: number) {
    setEditingStudent(student);
    setEditRent(rent.toString());
    setEditBedFee(bedFee.toString());
    setEditEstFee(estFee.toString());
  }

  async function handleSaveStudentFees(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSubmitting(true);
    
    try {
      // 1. Set Rent
      if (editRent !== "") {
        const rentRes = await fetch("/api/billing/config/rent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: editingStudent.id,
            hostelId: selectedHostel,
            amount: parseFloat(editRent),
          }),
        });
        if (!rentRes.ok) throw new Error("Failed to set rent");
      }

      // 2. Set Bed Fee (if student is assigned to a bed)
      if (editBedFee !== "") {
        const activeBed = editingStudent.bedAssignments?.[0]?.bed;
        if (activeBed) {
          const bedRes = await fetch("/api/billing/config/bed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hostelId: selectedHostel,
              roomId: activeBed.roomId,
              bedId: activeBed.id,
              amount: parseFloat(editBedFee),
            }),
          });
          if (!bedRes.ok) throw new Error("Failed to set bed fee");
        }
      }

      // 3. Set Establishment Fee
      if (editEstFee !== "") {
        const estRes = await fetch("/api/billing/config/establishment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostelId: selectedHostel,
            amount: parseFloat(editEstFee),
          }),
        });
        if (!estRes.ok) throw new Error("Failed to set establishment fee");
      }

      toast.success("Student fees updated successfully");
      setEditingStudent(null);
      fetchConfig();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
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
            <SelectValue placeholder="Select a hostel">
              {hostels.find(h => h.id === selectedHostel)?.name}
            </SelectValue>
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
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students List</TabsTrigger>
            <TabsTrigger value="register">Rent Register</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
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

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Establishment Fee</CardTitle>
                  <CardDescription>Set the base establishment fee applied to all students in this hostel.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSetEstFee} className="space-y-4">
                    <div className="space-y-2 max-w-sm">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configure Student Rent</CardTitle>
                  <CardDescription>Set the base rent amount for specific students.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSetRent} className="flex flex-col sm:flex-row items-end gap-4 mb-8">
                    <div className="space-y-2 flex-1">
                      <Label>Student</Label>
                      <Select value={selectedStudent} onValueChange={(val) => setSelectedStudent(val || "")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student">
                            {(() => {
                              if (!selectedStudent || !configData?.activeStudents) return null;
                              const student = configData.activeStudents.find((s: any) => s.id === selectedStudent);
                              return student ? (student.studentProfile?.fullName || student.username) : null;
                            })()}
                          </SelectValue>
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
                    <div className="space-y-2 w-full sm:w-32">
                      <Label>Amount (₹)</Label>
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

                  <div className="rounded-md border h-[300px] overflow-auto">
                    <table className="w-full text-sm text-left relative">
                      <thead className="bg-muted text-muted-foreground border-b sticky top-0">
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

              <Card>
                <CardHeader>
                  <CardTitle>Bed Fees</CardTitle>
                  <CardDescription>Configure extra fees based on room or specific bed.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSetBedFee} className="space-y-4 mb-8">
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
                              <SelectValue placeholder="Select Room">
                                {(() => {
                                  if (!selectedRoomId || !configData?.rooms) return null;
                                  const room = configData.rooms.find((r: any) => r.id === selectedRoomId);
                                  return room ? `Room ${room.roomNumber}` : null;
                                })()}
                              </SelectValue>
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
                              <SelectValue placeholder="Select Bed">
                                {(() => {
                                  if (!selectedBedId || !selectedRoomId || !configData?.rooms) return null;
                                  const room = configData.rooms.find((r: any) => r.id === selectedRoomId);
                                  const bed = room?.beds.find((b: any) => b.id === selectedBedId);
                                  return bed ? `Bed ${bed.bedLabel}` : null;
                                })()}
                              </SelectValue>
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

                  <div className="rounded-md border h-[300px] overflow-auto">
                    <table className="w-full text-sm text-left relative">
                      <thead className="bg-muted text-muted-foreground border-b sticky top-0">
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
            </div>
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Students Billing List</CardTitle>
                <CardDescription>View all students and their configured fees in an excel-like sheet.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Student Name</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">Room / Bed</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Room Rent (₹)</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Bed Fee (₹)</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Est. Fee (₹)</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Total Est. (₹)</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configData.activeStudents?.length > 0 ? (
                        configData.activeStudents.map((student: any) => {
                          const rentConfig = configData.rentConfigs?.find((rc: any) => rc.userId === student.id);
                          const rentAmount = rentConfig ? parseFloat(rentConfig.amount) : 0;
                          
                          const estFeeAmount = configData.establishmentFees?.[0] ? parseFloat(configData.establishmentFees[0].amount) : 0;
                          
                          const activeBed = student.bedAssignments?.[0]?.bed;
                          const activeRoomId = activeBed?.roomId;
                          
                          const bedSpecificFee = activeBed ? configData.bedFees?.find((f: any) => f.bedId === activeBed.id) : null;
                          const roomSpecificFee = activeRoomId ? configData.bedFees?.find((f: any) => f.roomId === activeRoomId && !f.bedId) : null;
                          const hostelSpecificFee = configData.bedFees?.find((f: any) => !f.bedId && !f.roomId);
                          
                          const applicableBedFee = bedSpecificFee || roomSpecificFee || hostelSpecificFee;
                          const bedFeeAmount = applicableBedFee ? parseFloat(applicableBedFee.amount) : 0;

                          const totalEst = rentAmount + estFeeAmount + bedFeeAmount;

                          return (
                            <tr key={student.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium whitespace-nowrap">{student.studentProfile?.fullName || student.username}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {activeBed ? `Room ${activeBed.room?.roomNumber} - Bed ${activeBed.bedLabel}` : "Not Assigned"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">{rentAmount.toFixed(2)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">{bedFeeAmount.toFixed(2)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">{estFeeAmount.toFixed(2)}</td>
                              <td className="px-4 py-3 font-bold whitespace-nowrap text-right">{totalEst.toFixed(2)}</td>
                              <td className="px-4 py-3 text-center">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditStudent(student, rentAmount, bedFeeAmount, estFeeAmount)}
                                >
                                  Configure
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                            No active students found in this hostel.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Rent Register</CardTitle>
                  <CardDescription>Comprehensive view of student billing and payment history.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Year:</Label>
                  <Select value={selectedYear} onValueChange={(v) => setSelectedYear(v || new Date().getFullYear().toString())}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isRegisterLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <div className="rounded-md border overflow-x-auto w-full max-w-[calc(100vw-3rem)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground border-b whitespace-nowrap">
                        <tr>
                          <th className="px-3 py-2 font-medium sticky left-0 bg-muted z-10 border-r">Name</th>
                          <th className="px-3 py-2 font-medium">Joined</th>
                          <th className="px-3 py-2 font-medium">Left</th>
                          <th className="px-3 py-2 font-medium">Bed Fee</th>
                          <th className="px-3 py-2 font-medium">Est. Fee</th>
                          <th className="px-3 py-2 font-medium text-right">Room Rent</th>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                            <th key={month} className="px-3 py-2 font-medium text-center">{month}</th>
                          ))}
                          <th className="px-3 py-2 font-medium text-center sticky right-0 bg-muted z-10 border-l">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registerData?.length > 0 ? (
                          registerData.map((student: any) => {
                            const rentAmount = student.baseRent;
                            const estFeeAmount = configData?.establishmentFees?.[0] ? parseFloat(configData.establishmentFees[0].amount) : 0;
                            const activeBed = student.bedAssignments?.[0]?.bed;
                            const activeRoomId = activeBed?.roomId;
                            const bedSpecificFee = activeBed ? configData?.bedFees?.find((f: any) => f.bedId === activeBed.id) : null;
                            const roomSpecificFee = activeRoomId ? configData?.bedFees?.find((f: any) => f.roomId === activeRoomId && !f.bedId) : null;
                            const hostelSpecificFee = configData?.bedFees?.find((f: any) => !f.bedId && !f.roomId);
                            const applicableBedFee = bedSpecificFee || roomSpecificFee || hostelSpecificFee;
                            const bedFeeAmount = applicableBedFee ? parseFloat(applicableBedFee.amount) : 0;

                            return (
                              <tr key={student.id} className={`border-b last:border-0 hover:bg-muted/50 whitespace-nowrap ${!student.isActive ? "opacity-60" : ""}`}>
                                <td className="px-3 py-2 font-medium sticky left-0 bg-background border-r flex items-center gap-2">
                                  {!student.isActive && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Left</Badge>}
                                  {student.name}
                                </td>
                                <td className="px-3 py-2">{format(new Date(student.joiningDate), "dd/MM/yyyy")}</td>
                                <td className="px-3 py-2">{student.leftDate ? format(new Date(student.leftDate), "dd/MM/yyyy") : "-"}</td>
                                
                                {/* Bed Fee */}
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    {student.bedFee.amount > 0 ? (
                                      <>
                                        <span className="font-medium">₹{student.bedFee.amount}</span>
                                        {student.bedFee.status === "PAID" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                        {student.bedFee.status === "PARTIALLY_PAID" && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                                        {(student.bedFee.status === "GENERATED" || student.bedFee.status === "OVERDUE") && <XCircle className="w-3 h-3 text-red-500" />}
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </div>
                                </td>

                                {/* Est Fee */}
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    {student.estFee.amount > 0 ? (
                                      <>
                                        <span className="font-medium">₹{student.estFee.amount}</span>
                                        {student.estFee.status === "PAID" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                        {student.estFee.status === "PARTIALLY_PAID" && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                                        {(student.estFee.status === "GENERATED" || student.estFee.status === "OVERDUE") && <XCircle className="w-3 h-3 text-red-500" />}
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </div>
                                </td>

                                {/* Base Rent */}
                                <td className="px-3 py-2 text-right font-medium">
                                  {student.baseRent > 0 ? `₹${student.baseRent}` : <span className="text-muted-foreground">0</span>}
                                </td>

                                {/* Months */}
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                  const bill = student.monthly[m];
                                  return (
                                    <td key={m} className="px-3 py-2 text-center">
                                      {bill ? (
                                        <div className="flex items-center justify-center gap-1">
                                          <span>₹{bill.amount}</span>
                                          {bill.status === "PAID" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                          {bill.status === "PARTIALLY_PAID" && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                                          {(bill.status === "GENERATED" || bill.status === "OVERDUE") && <XCircle className="w-3 h-3 text-red-500" />}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground/30">-</span>
                                      )}
                                    </td>
                                  );
                                })}

                                {/* Action */}
                                <td className="px-3 py-2 text-center sticky right-0 bg-background border-l">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    disabled={!student.isActive}
                                    onClick={() => handleEditStudent(student, rentAmount, bedFeeAmount, estFeeAmount)}
                                  >
                                    Configure
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={19} className="px-4 py-8 text-center text-muted-foreground">
                              No students found for this year.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      ) : (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Edit Student Fees Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Fees</DialogTitle>
            <DialogDescription>
              Set billing configuration for <strong>{editingStudent?.studentProfile?.fullName || editingStudent?.username}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveStudentFees} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Room Rent (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={editRent} 
                onChange={(e) => setEditRent(e.target.value)} 
                required
              />
              <p className="text-[11px] text-muted-foreground">Sets custom rent amount specifically for this student.</p>
            </div>
            <div className="space-y-2">
              <Label>Bed Fee (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={editBedFee} 
                onChange={(e) => setEditBedFee(e.target.value)} 
                disabled={!editingStudent?.bedAssignments?.[0]?.bed}
                required
              />
              {!editingStudent?.bedAssignments?.[0]?.bed ? (
                <p className="text-[11px] text-red-500">Student is not assigned to a bed.</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Sets fee for <strong>{editingStudent?.bedAssignments?.[0]?.bed?.bedLabel}</strong> in Room {editingStudent?.bedAssignments?.[0]?.bed?.room?.roomNumber}.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Establishment Fee (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={editEstFee} 
                onChange={(e) => setEditEstFee(e.target.value)} 
                required
              />
              <p className="text-[11px] text-amber-600 font-medium">Note: Changing this will update the Establishment Fee for the entire hostel.</p>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingStudent(null)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
