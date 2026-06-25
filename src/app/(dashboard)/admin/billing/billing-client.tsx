"use client";

import { useEffect, useState } from "react";
import { 
  Loader2, Receipt, CreditCard, CheckCircle2, XCircle, AlertTriangle, Building2, User, KeyRound, Clock, FolderOpen
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
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
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-400 mt-3">Loading billing data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing & Fees</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure hostel fees and generate monthly bills.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedHostel} onValueChange={(val) => setSelectedHostel(val || "")}>
            <SelectTrigger className="w-[200px] h-9 border-slate-200 rounded-lg bg-white text-sm">
              <SelectValue placeholder="Select hostel">
                {hostels.find(h => h.id === selectedHostel)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {hostels.map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleGenerateBills} 
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 rounded-lg px-4 text-sm font-medium cursor-pointer"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}
            Generate Bills
          </Button>
        </div>
      </div>

      {!isLoading && configData ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-[400px] bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="overview" className="text-xs sm:text-sm rounded-md py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="students" className="text-xs sm:text-sm rounded-md py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Students</TabsTrigger>
            <TabsTrigger value="register" className="text-xs sm:text-sm rounded-md py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Active Config Summary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden h-fit">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Active Config</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Est. Fee</span>
                    <span className="text-sm font-bold text-slate-900">
                      {configData.establishmentFees?.[0] ? `₹${configData.establishmentFees[0].amount}` : "Not Set"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Bed Fees</span>
                    <span className="text-sm font-medium text-slate-800">{configData.bedFees?.length || 0} levels</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Custom Rent</span>
                    <span className="text-sm font-medium text-slate-800">{configData.rentConfigs?.length || 0} students</span>
                  </div>
                </div>
              </div>

              {/* Establishment Fee Setting */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Establishment Fee</h3>
                    <p className="text-xs text-slate-400">Base fee applied to all students in this hostel</p>
                  </div>
                </div>
                <div className="p-5">
                  <form onSubmit={handleSetEstFee} className="flex flex-col sm:flex-row items-end gap-3 max-w-md">
                    <div className="space-y-1.5 flex-1 w-full">
                      <Label className="text-xs font-semibold text-slate-600">Fee Amount (₹)</Label>
                      <Input 
                        type="number" min="0" step="0.01" 
                        value={estFeeAmount} 
                        onChange={(e) => setEstFeeAmount(e.target.value)} 
                        placeholder="e.g. 1500"
                        className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" 
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="h-9 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm w-full sm:w-auto cursor-pointer">
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : "Save"}
                    </Button>
                  </form>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Student Rent */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Student Custom Rent</h3>
                    <p className="text-xs text-slate-400">Override base rent for specific students</p>
                  </div>
                </div>
                <div className="p-5">
                  <form onSubmit={handleSetRent} className="flex flex-col sm:flex-row items-end gap-3 mb-6">
                    <div className="space-y-1.5 flex-[2]">
                      <Label className="text-xs font-semibold text-slate-600">Student</Label>
                      <Select value={selectedStudent} onValueChange={(val) => setSelectedStudent(val || "")}>
                        <SelectTrigger className="h-9 border-slate-200 rounded-lg text-sm bg-white">
                          <SelectValue placeholder="Select student">
                            {selectedStudent 
                              ? (configData.activeStudents?.find((s: any) => s.id === selectedStudent)?.studentProfile?.fullName || 
                                 configData.activeStudents?.find((s: any) => s.id === selectedStudent)?.username) 
                              : null}
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
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-xs font-semibold text-slate-600">Amount (₹)</Label>
                      <Input 
                        type="number" min="0" step="0.01" 
                        value={rentAmount} 
                        onChange={(e) => setRentAmount(e.target.value)} 
                        className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" 
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="h-9 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm cursor-pointer">
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Set"}
                    </Button>
                  </form>

                  <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50/50 max-h-[250px] overflow-y-auto">
                    <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-2.5 border-b border-slate-100 bg-slate-100/50 sticky top-0">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Rent</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">From</span>
                    </div>
                    {configData.rentConfigs?.length > 0 ? (
                      configData.rentConfigs.map((rc: any) => (
                        <div key={rc.id} className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-white transition-colors items-center">
                          <span className="text-sm font-medium text-slate-800 truncate">{rc.user?.studentProfile?.fullName || rc.user?.username}</span>
                          <span className="text-sm font-semibold text-green-700 text-right">₹{parseFloat(rc.amount).toFixed(0)}</span>
                          <span className="text-xs text-slate-500 text-right">{format(new Date(rc.effectiveFrom), "MMM d, yy")}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400">No custom rent configured.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bed Fees */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                    <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Bed Fees</h3>
                    <p className="text-xs text-slate-400">Extra fees based on room/bed</p>
                  </div>
                </div>
                <div className="p-5">
                  <form onSubmit={handleSetBedFee} className="space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <Label className="text-xs font-semibold text-slate-600">Level</Label>
                        <Select value={selectedBedLevel} onValueChange={(val) => setSelectedBedLevel(val || "")}>
                          <SelectTrigger className="h-9 border-slate-200 rounded-lg text-sm bg-white">
                            <SelectValue>
                              {selectedBedLevel === "hostel" ? "All Beds" : 
                               selectedBedLevel === "room" ? "Specific Room" : 
                               selectedBedLevel === "bed" ? "Specific Bed" : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hostel">All Beds</SelectItem>
                            <SelectItem value="room">Specific Room</SelectItem>
                            <SelectItem value="bed">Specific Bed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <Label className="text-xs font-semibold text-slate-600">Amount (₹)</Label>
                        <Input 
                          type="number" min="0" step="0.01" 
                          value={bedFeeAmount} 
                          onChange={(e) => setBedFeeAmount(e.target.value)} 
                          className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" 
                        />
                      </div>

                      {(selectedBedLevel === "room" || selectedBedLevel === "bed") && (
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                          <Label className="text-xs font-semibold text-slate-600">Room</Label>
                          <Select value={selectedRoomId} onValueChange={(val) => setSelectedRoomId(val || "")}>
                            <SelectTrigger className="h-9 border-slate-200 rounded-lg text-sm bg-white">
                              <SelectValue placeholder="Select Room">
                                {selectedRoomId ? `Room ${configData.rooms?.find((r: any) => r.id === selectedRoomId)?.roomNumber}` : null}
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
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                          <Label className="text-xs font-semibold text-slate-600">Bed</Label>
                          <Select value={selectedBedId} onValueChange={(val) => setSelectedBedId(val || "")}>
                            <SelectTrigger className="h-9 border-slate-200 rounded-lg text-sm bg-white">
                              <SelectValue placeholder="Select Bed">
                                {selectedBedId ? `Bed ${configData.rooms?.find((r: any) => r.id === selectedRoomId)?.beds?.find((b: any) => b.id === selectedBedId)?.bedLabel}` : null}
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
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full h-9 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm cursor-pointer">
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add Bed Fee"}
                    </Button>
                  </form>

                  <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50/50 max-h-[200px] overflow-y-auto">
                    <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-2.5 border-b border-slate-100 bg-slate-100/50 sticky top-0">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Fee</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">From</span>
                    </div>
                    {configData.bedFees?.length > 0 ? (
                      configData.bedFees.map((f: any) => (
                        <div key={f.id} className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-white transition-colors items-center">
                          <span className="text-xs font-medium text-slate-800 truncate">
                            {f.bedId ? `Rm ${f.room?.roomNumber} - Bd ${f.bed?.bedLabel}` : f.roomId ? `Rm ${f.room?.roomNumber}` : "All"}
                          </span>
                          <span className="text-sm font-semibold text-slate-700 text-right">₹{parseFloat(f.amount).toFixed(0)}</span>
                          <span className="text-xs text-slate-500 text-right">{format(new Date(f.effectiveFrom), "MMM d, yy")}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400">No bed fees configured.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="students" className="mt-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Student Billing List</h3>
                    <p className="text-xs text-slate-400">Current fee breakdown per student</p>
                  </div>
                </div>
              </div>
              <>
                <div className="hidden md:block">
                  <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.5fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignment</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Rent</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Bed Fee</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Est. Fee</span>
                    <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider text-right">Total/Mo</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Action</span>
                  </div>
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
                        <div key={student.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.5fr_1fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                          <span className="text-sm font-medium text-slate-800 truncate">{student.studentProfile?.fullName || student.username}</span>
                          <span className="text-xs text-slate-500">
                            {activeBed ? `Rm ${activeBed.room?.roomNumber} / Bd ${activeBed.bedLabel}` : "Unassigned"}
                          </span>
                          <span className="text-sm font-medium text-slate-700 text-right">{rentAmount.toFixed(0)}</span>
                          <span className="text-sm font-medium text-slate-700 text-right">{bedFeeAmount.toFixed(0)}</span>
                          <span className="text-sm font-medium text-slate-700 text-right">{estFeeAmount.toFixed(0)}</span>
                          <span className="text-sm font-bold text-slate-900 text-right bg-slate-100 rounded px-2 py-0.5 justify-self-end">{totalEst.toFixed(0)}</span>
                          <div className="flex justify-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                              onClick={() => handleEditStudent(student, rentAmount, bedFeeAmount, estFeeAmount)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-sm text-slate-400">No active students found.</div>
                  )}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-3">
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
                        <div key={student.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{student.studentProfile?.fullName || student.username}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {activeBed ? `Rm ${activeBed.room?.roomNumber} / Bd ${activeBed.bedLabel}` : "Unassigned"}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                              onClick={() => handleEditStudent(student, rentAmount, bedFeeAmount, estFeeAmount)}
                            >
                              Edit
                            </Button>
                          </div>
                          <div className="space-y-2 pt-3 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">Rent</span>
                              <span className="text-sm font-medium text-slate-700">₹{rentAmount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">Bed Fee</span>
                              <span className="text-sm font-medium text-slate-700">₹{bedFeeAmount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">Est. Fee</span>
                              <span className="text-sm font-medium text-slate-700">₹{estFeeAmount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                              <span className="text-xs font-semibold text-slate-800">Total/Mo</span>
                              <span className="text-sm font-bold text-slate-900 bg-slate-100 rounded px-2 py-0.5">₹{totalEst.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-sm text-slate-400">No active students found.</div>
                  )}
                </div>
              </>
            </div>
          </TabsContent>

          <TabsContent value="register" className="mt-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <Receipt className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Rent Register</h3>
                    <p className="text-xs text-slate-400">Spreadsheet view of monthly billing</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-slate-500">Year:</Label>
                  <Select value={selectedYear} onValueChange={(v) => setSelectedYear(v || new Date().getFullYear().toString())}>
                    <SelectTrigger className="w-24 h-8 border-slate-200 rounded-lg text-xs bg-white">
                      <SelectValue>
                        {selectedYear}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="p-0">
                {isRegisterLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    {/* EXCEPTION: Horizontal scroll permitted here due to massive column count */}
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 whitespace-nowrap">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold sticky left-0 bg-slate-50 z-10 border-r border-slate-200 uppercase tracking-wider">Student Name</th>
                          <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Joined</th>
                          <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Left</th>
                          <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Bed Fee</th>
                          <th className="px-3 py-2.5 font-semibold uppercase tracking-wider">Est. Fee</th>
                          <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-right">Rent</th>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                            <th key={month} className="px-3 py-2.5 font-semibold uppercase tracking-wider text-center border-l border-slate-100">{month}</th>
                          ))}
                          <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-center sticky right-0 bg-slate-50 z-10 border-l border-slate-200">Action</th>
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
                              <tr key={student.id} className={`border-b border-slate-100 hover:bg-slate-50/50 whitespace-nowrap ${!student.isActive ? "opacity-60 bg-slate-50/30" : ""}`}>
                                <td className="px-3 py-2.5 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50/50 border-r border-slate-100 flex items-center gap-2">
                                  {!student.isActive && <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-slate-100 text-slate-500 border-slate-200">Left</Badge>}
                                  {student.name}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">{format(new Date(student.joiningDate), "dd/MM/yy")}</td>
                                <td className="px-3 py-2.5 text-slate-600">{student.leftDate ? format(new Date(student.leftDate), "dd/MM/yy") : "-"}</td>
                                
                                {/* Bed Fee */}
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    {student.bedFee.amount > 0 ? (
                                      <>
                                        <span className="font-medium text-slate-700">{student.bedFee.amount}</span>
                                        {student.bedFee.status === "PAID" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                        {student.bedFee.status === "PARTIALLY_PAID" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                        {(student.bedFee.status === "GENERATED" || student.bedFee.status === "OVERDUE") && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                      </>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </div>
                                </td>

                                {/* Est Fee */}
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    {student.estFee.amount > 0 ? (
                                      <>
                                        <span className="font-medium text-slate-700">{student.estFee.amount}</span>
                                        {student.estFee.status === "PAID" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                        {student.estFee.status === "PARTIALLY_PAID" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                        {(student.estFee.status === "GENERATED" || student.estFee.status === "OVERDUE") && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                      </>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </div>
                                </td>

                                {/* Base Rent */}
                                <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                                  {student.baseRent > 0 ? student.baseRent : <span className="text-slate-300">0</span>}
                                </td>

                                {/* Months */}
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                  const bill = student.monthly[m];
                                  return (
                                    <td key={m} className="px-3 py-2.5 text-center border-l border-slate-50">
                                      {bill ? (
                                        <div className="flex items-center justify-center gap-1.5">
                                          <span className="font-medium text-slate-700">{bill.amount}</span>
                                          {bill.status === "PAID" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                          {bill.status === "PARTIALLY_PAID" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                          {(bill.status === "GENERATED" || bill.status === "OVERDUE") && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                        </div>
                                      ) : (
                                        <span className="text-slate-200">-</span>
                                      )}
                                    </td>
                                  );
                                })}

                                {/* Action */}
                                <td className="px-2 py-2 text-center sticky right-0 bg-white group-hover:bg-slate-50/50 border-l border-slate-100">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                                    disabled={!student.isActive}
                                    onClick={() => handleEditStudent(student, rentAmount, bedFeeAmount, estFeeAmount)}
                                  >
                                    Edit
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={19} className="px-4 py-8 text-center text-sm text-slate-400">
                              No students found for this year.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

        </Tabs>
      ) : null}

      {/* Edit Student Fees Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-sm w-full p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">Configure Fees</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Set billing configuration for <strong>{editingStudent?.studentProfile?.fullName || editingStudent?.username}</strong>.
            </DialogDescription>
          </div>
          <form onSubmit={handleSaveStudentFees}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Room Rent (₹)</Label>
                <Input 
                  type="number" min="0" step="0.01" 
                  value={editRent} 
                  onChange={(e) => setEditRent(e.target.value)} 
                  required
                  className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-slate-400 mt-1.5">Sets custom rent amount specifically for this student.</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Bed Fee (₹)</Label>
                <Input 
                  type="number" min="0" step="0.01" 
                  value={editBedFee} 
                  onChange={(e) => setEditBedFee(e.target.value)} 
                  disabled={!editingStudent?.bedAssignments?.[0]?.bed}
                  required={!!editingStudent?.bedAssignments?.[0]?.bed}
                  className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                />
                {!editingStudent?.bedAssignments?.[0]?.bed ? (
                  <p className="text-xs text-red-500 mt-1.5">Student is not assigned to a bed.</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1.5">Sets fee for <strong>{editingStudent?.bedAssignments?.[0]?.bed?.bedLabel}</strong> in Room {editingStudent?.bedAssignments?.[0]?.bed?.room?.roomNumber}.</p>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Establishment Fee (₹)</Label>
                <Input 
                  type="number" min="0" step="0.01" 
                  value={editEstFee} 
                  onChange={(e) => setEditEstFee(e.target.value)} 
                  required
                  className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-amber-600 font-medium mt-1.5">Note: Changing this will update the Establishment Fee for the entire hostel.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <Button type="button" variant="ghost" onClick={() => setEditingStudent(null)} disabled={isSubmitting} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer">
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

