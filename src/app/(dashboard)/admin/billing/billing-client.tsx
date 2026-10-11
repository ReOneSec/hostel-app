"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { TablePageSkeleton } from "@/components/skeletons/page-skeletons";
import { 
  Loader2, Receipt, CreditCard, CheckCircle2, XCircle, AlertTriangle, Building2, User, KeyRound, Clock, FolderOpen,
  Search, RefreshCw, Table as TableIcon, Download
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/lib/pdf-generator";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [registerSearch, setRegisterSearch] = useState("");
  const isFirstMount = useRef(true);
  
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
  
  // Bill Status States
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [isBillStatusDialogOpen, setIsBillStatusDialogOpen] = useState(false);
  const [billStatusValue, setBillStatusValue] = useState<string>("PAID");
  const [isUpdatingBill, setIsUpdatingBill] = useState(false);

  // Month Payment Status States
  const [monthEditTarget, setMonthEditTarget] = useState<{
    studentId: string;
    studentName: string;
    baseRent: number;
    month: number;
    monthName: string;
    year: number;
    bill: {
      id: string | null;
      amount: number;
      status: string;
      paidDate?: any;
      utrNumber?: any;
      payments?: any[];
    } | null;
  } | null>(null);
  const [monthStatusValue, setMonthStatusValue] = useState<string>("PAID");
  const [monthAmountValue, setMonthAmountValue] = useState<string>("");
  const [isUpdatingMonth, setIsUpdatingMonth] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!selectedHostel) {
      setConfigData(null);
      setRegisterData([]);
      return;
    }

    if (isFirstMount.current && selectedHostel === initialHostels[0]?.id && initialConfigData) {
      isFirstMount.current = false;
      setConfigData(initialConfigData);
      setEstFeeAmount(initialConfigData.establishmentFees?.[0]?.amount?.toString() || "");
      setIsLoading(false);
    } else {
      fetchConfig();
    }
  }, [selectedHostel]);

  useEffect(() => {
    if (!selectedHostel) return;
    
    if (isFirstMount.current && selectedHostel === initialHostels[0]?.id && selectedYear === initialYear) {
      setRegisterData(initialRegisterData);
    } else {
      fetchRegisterData();
    }
  }, [selectedHostel, selectedYear]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchConfig(), fetchRegisterData()]);
      toast.success("Billing data refreshed successfully");
    } catch {
      toast.error("Failed to refresh billing data");
    } finally {
      setIsRefreshing(false);
    }
  }

  const filteredStudents = useMemo(() => {
    if (!configData?.activeStudents) return [];
    let list = configData.activeStudents;
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase().trim();
      list = list.filter((s: any) => {
        const name = (s.studentProfile?.fullName || "").toLowerCase();
        const username = (s.username || "").toLowerCase();
        const bed = s.bedAssignments?.[0]?.bed;
        const room = (bed?.room?.roomNumber || "").toLowerCase();
        const bedLabel = (bed?.bedLabel || "").toLowerCase();
        return name.includes(q) || username.includes(q) || room.includes(q) || bedLabel.includes(q);
      });
    }
    return [...list].sort((a: any, b: any) => {
      const nameA = a.studentProfile?.fullName?.trim() || a.username || "";
      const nameB = b.studentProfile?.fullName?.trim() || b.username || "";
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
  }, [configData?.activeStudents, studentSearch]);

  const filteredRegister = useMemo(() => {
    if (!registerData) return [];
    let list = registerData;
    if (registerSearch.trim()) {
      const q = registerSearch.toLowerCase().trim();
      list = list.filter((s: any) => {
        const name = (s.name || "").toLowerCase();
        const username = (s.username || "").toLowerCase();
        const bed = s.bedAssignments?.[0]?.bed;
        const room = (bed?.room?.roomNumber || "").toLowerCase();
        const bedLabel = (bed?.bedLabel || "").toLowerCase();
        return name.includes(q) || username.includes(q) || room.includes(q) || bedLabel.includes(q);
      });
    }
    return [...list].sort((a: any, b: any) => {
      const nameA = a.name?.trim() || a.username || "";
      const nameB = b.name?.trim() || b.username || "";
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
  }, [registerData, registerSearch]);

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

  async function handleUpdateBillStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBillId) return;
    setIsUpdatingBill(true);
    
    try {
      const res = await fetch(`/api/billing/bills/${selectedBillId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: billStatusValue }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update bill status");
      toast.success("Bill status updated successfully");
      setIsBillStatusDialogOpen(false);
      fetchRegisterData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdatingBill(false);
    }
  }

  function handleOpenMonthEdit(student: any, month: number, bill: any) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[month - 1];
    setMonthEditTarget({
      studentId: student.id,
      studentName: student.name,
      baseRent: student.baseRent,
      month,
      monthName,
      year: parseInt(selectedYear, 10),
      bill: bill
        ? {
            id: bill.id,
            amount: bill.amount,
            status: bill.status,
            paidDate: bill.paidDate,
            utrNumber: bill.utrNumber,
            payments: bill.payments,
          }
        : null,
    });

    if (bill) {
      setMonthStatusValue(bill.status);
      setMonthAmountValue(bill.amount !== undefined ? bill.amount.toString() : "");
    } else {
      setMonthStatusValue("PAID");
      setMonthAmountValue(student.baseRent > 0 ? student.baseRent.toString() : "0");
    }
  }

  async function handleSaveMonthStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!monthEditTarget || !selectedHostel) return;
    setIsUpdatingMonth(true);

    try {
      const res = await fetch("/api/billing/bills/month-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: selectedHostel,
          userId: monthEditTarget.studentId,
          month: monthEditTarget.month,
          year: monthEditTarget.year,
          status: monthStatusValue,
          amount: monthAmountValue !== "" ? parseFloat(monthAmountValue) : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update payment status");

      toast.success(json.message || "Payment status updated successfully");
      setMonthEditTarget(null);
      fetchRegisterData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment status");
    } finally {
      setIsUpdatingMonth(false);
    }
  }

  if (isLoading && !hostels.length) {
    return <TablePageSkeleton />;
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
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-9 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
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
          <TabsList className="grid w-full grid-cols-3 md:w-[480px] bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="overview" className="text-xs sm:text-sm rounded-md py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="students" className="text-xs sm:text-sm rounded-md py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center gap-1.5">
              <span>Students</span>
              {configData.activeStudents?.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200/90 text-[11px] font-semibold text-slate-700">
                  {configData.activeStudents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="register" className="text-xs sm:text-sm rounded-md py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center gap-1.5">
              <span>Register</span>
              {registerData?.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200/90 text-[11px] font-semibold text-slate-700">
                  {registerData.length}
                </span>
              )}
            </TabsTrigger>
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
                  <form onSubmit={handleSetRent} className="space-y-4 mb-6">
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">Select Student</Label>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {studentSearch ? `${filteredStudents.length} of ${configData.activeStudents?.length || 0} students` : `${configData.activeStudents?.length || 0} students`}
                        </span>
                      </div>

                      {/* Quick Search Input */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input 
                          placeholder="Type name, room (e.g. L01) or bed to filter list..." 
                          value={studentSearch} 
                          onChange={(e) => setStudentSearch(e.target.value)} 
                          className="h-9 pl-9 pr-8 text-xs border-slate-200 rounded-lg bg-slate-50/70 focus:bg-white transition-colors" 
                        />
                        {studentSearch && (
                          <button
                            type="button"
                            onClick={() => setStudentSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold p-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <Select value={selectedStudent} onValueChange={(val) => setSelectedStudent(val || "")}>
                        <SelectTrigger className="h-10 border-slate-200 rounded-lg text-sm bg-white w-full hover:border-slate-300 transition-colors shadow-sm">
                          <SelectValue placeholder={studentSearch ? `Select from ${filteredStudents.length} matching students...` : "Select student..."}>
                            {selectedStudent ? (() => {
                              const s = configData.activeStudents?.find((st: any) => st.id === selectedStudent);
                              if (!s) return null;
                              const name = s.studentProfile?.fullName?.trim() || s.username;
                              const bed = s.bedAssignments?.[0]?.bed;
                              return (
                                <div className="flex items-center justify-between w-full gap-2 pr-1">
                                  <span className="font-semibold text-slate-800 truncate">{name}</span>
                                  {bed ? (
                                    <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200/80 rounded px-2 py-0.5 shrink-0">
                                      Room {bed.room?.roomNumber} · Bed {bed.bedLabel}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400 bg-slate-100 rounded px-2 py-0.5 shrink-0">
                                      No Bed
                                    </span>
                                  )}
                                </div>
                              );
                            })() : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent 
                          align="start" 
                          alignItemWithTrigger={false}
                          className="max-h-80 w-[min(calc(100vw-32px),540px)] min-w-[340px] sm:min-w-[480px] p-1.5 shadow-xl border-slate-200"
                        >
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map((s: any) => {
                              const name = s.studentProfile?.fullName?.trim() || s.username;
                              const bed = s.bedAssignments?.[0]?.bed;
                              return (
                                <SelectItem 
                                  key={s.id} 
                                  value={s.id}
                                  className="py-2.5 px-3 rounded-lg cursor-pointer hover:bg-slate-50 focus:bg-blue-50/70"
                                >
                                  <div className="flex items-center justify-between w-full gap-4 text-left">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-900 text-sm">{name}</p>
                                      <p className="text-[11px] text-slate-400">@{s.username}</p>
                                    </div>
                                    {bed ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-md px-2.5 py-1 whitespace-nowrap shrink-0">
                                        Room {bed.room?.roomNumber} · Bed {bed.bedLabel}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-xs text-slate-400 bg-slate-100 rounded-md px-2 py-1 whitespace-nowrap shrink-0">
                                        No Bed
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })
                          ) : (
                            <div className="py-6 text-center text-xs text-slate-400">
                              No students found matching "{studentSearch}"
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end gap-3 pt-1">
                      <div className="space-y-1.5 flex-1 w-full">
                        <Label className="text-xs font-semibold text-slate-700">Custom Rent Amount (₹)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">₹</span>
                          <Input 
                            type="number" min="0" step="0.01" 
                            value={rentAmount} 
                            onChange={(e) => setRentAmount(e.target.value)} 
                            placeholder="e.g. 2500"
                            className="h-10 pl-7 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" 
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="h-10 px-6 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm font-semibold cursor-pointer shrink-0 w-full sm:w-auto shadow-sm"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Set Custom Rent"}
                      </Button>
                    </div>
                  </form>

                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50 max-h-[280px] overflow-y-auto">
                    <div className="grid grid-cols-[2fr_1fr_1fr] px-4 py-2.5 border-b border-slate-200 bg-slate-100/70 sticky top-0 z-10">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student & Room</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Rent</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Effective From</span>
                    </div>
                    {configData.rentConfigs?.length > 0 ? (
                      configData.rentConfigs.map((rc: any) => {
                        const studentName = rc.user?.studentProfile?.fullName?.trim() || rc.user?.username;
                        const bed = rc.user?.bedAssignments?.[0]?.bed;
                        return (
                          <div key={rc.id} className="grid grid-cols-[2fr_1fr_1fr] px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-white transition-colors items-center">
                            <div className="min-w-0 pr-2">
                              <p className="text-sm font-semibold text-slate-800 truncate">{studentName}</p>
                              {bed && (
                                <p className="text-[11px] text-blue-600 font-medium">
                                  Room {bed.room?.roomNumber} · Bed {bed.bedLabel}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-green-700 text-right">₹{parseFloat(rc.amount).toFixed(0)}</span>
                            <span className="text-xs text-slate-500 text-right">{format(new Date(rc.effectiveFrom), "MMM d, yy")}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400">No custom rent configured.</div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 px-1">
                    Showing {configData.rentConfigs?.length || 0} students with custom rent overrides. Other students default to base rent of ₹0.
                  </p>
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
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Student Billing List ({filteredStudents.length}{configData.activeStudents?.length !== filteredStudents.length ? ` of ${configData.activeStudents?.length}` : ""})
                    </h3>
                    <p className="text-xs text-slate-400">Current fee breakdown per student in this hostel</p>
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search name, room, bed..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="h-8 pl-8 text-xs border-slate-200 rounded-lg bg-white"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
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
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student: any) => {
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
                          <span className="text-sm font-medium text-slate-800 truncate" title={student.studentProfile?.fullName?.trim() || student.username}>
                            {student.studentProfile?.fullName?.trim() || student.username}
                          </span>
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
                    <div className="p-12 text-center text-sm text-slate-400">
                      {studentSearch ? "No students matching your search." : "No active students found in this hostel."}
                    </div>
                  )}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-3">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student: any) => {
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
                              <p className="text-sm font-semibold text-slate-800">{student.studentProfile?.fullName?.trim() || student.username}</p>
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
                    <div className="p-12 text-center text-sm text-slate-400">
                      {studentSearch ? "No students matching your search." : "No active students found in this hostel."}
                    </div>
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
                    <TableIcon className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Annual Billing Register ({filteredRegister.length}{registerData?.length !== filteredRegister.length ? ` of ${registerData?.length}` : ""})
                    </h3>
                    <p className="text-xs text-slate-400">Spreadsheet view of monthly billing</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search register..."
                      value={registerSearch}
                      onChange={(e) => setRegisterSearch(e.target.value)}
                      className="h-8 pl-8 text-xs border-slate-200 rounded-lg bg-white"
                    />
                    {registerSearch && (
                      <button
                        type="button"
                        onClick={() => setRegisterSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
              </div>
              
              <div className="p-0">
                {isRegisterLoading ? (
                  <TablePageSkeleton rows={5} />
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
                        {filteredRegister?.length > 0 ? (
                          filteredRegister.map((student: any) => {
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
                                  {student.bedFee.amount > 0 ? (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (student.bedFee.id) {
                                          setSelectedBillId(student.bedFee.id);
                                          setBillStatusValue(student.bedFee.status);
                                          setIsBillStatusDialogOpen(true);
                                        }
                                      }}
                                      className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                                    >
                                      <span className="font-medium text-slate-700">{student.bedFee.amount}</span>
                                      {student.bedFee.status === "PAID" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                      {student.bedFee.status === "PARTIALLY_PAID" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                      {(student.bedFee.status === "GENERATED" || student.bedFee.status === "OVERDUE") && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 ml-2">-</span>
                                  )}
                                </td>

                                {/* Est Fee */}
                                <td className="px-3 py-2.5">
                                  {student.estFee.amount > 0 ? (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (student.estFee.id) {
                                          setSelectedBillId(student.estFee.id);
                                          setBillStatusValue(student.estFee.status);
                                          setIsBillStatusDialogOpen(true);
                                        }
                                      }}
                                      className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                                    >
                                      <span className="font-medium text-slate-700">{student.estFee.amount}</span>
                                      {student.estFee.status === "PAID" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                      {student.estFee.status === "PARTIALLY_PAID" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                      {(student.estFee.status === "GENERATED" || student.estFee.status === "OVERDUE") && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 ml-2">-</span>
                                  )}
                                </td>

                                {/* Base Rent */}
                                <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                                  {student.baseRent > 0 ? student.baseRent : <span className="text-slate-300">0</span>}
                                </td>

                                {/* Months */}
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                  const bill = student.monthly[m];
                                  return (
                                    <td key={m} className="px-1.5 py-1 text-center border-l border-slate-100">
                                      <button 
                                        type="button"
                                        onClick={() => handleOpenMonthEdit(student, m, bill)}
                                        className={`group/btn flex items-center justify-center gap-1 w-full min-w-[58px] h-7 px-1.5 rounded-md text-xs transition-all cursor-pointer ${
                                          bill 
                                            ? "hover:bg-slate-100 hover:ring-1 hover:ring-slate-300" 
                                            : "text-slate-300 hover:text-blue-600 hover:bg-blue-50/80 hover:ring-1 hover:ring-blue-300"
                                        }`}
                                        title={`Click to edit ${student.name}'s ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} payment status`}
                                      >
                                        {bill ? (
                                          <>
                                            <span className="font-semibold text-slate-700">{bill.amount}</span>
                                            {bill.status === "PAID" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                            {bill.status === "PARTIALLY_PAID" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                            {(bill.status === "GENERATED" || bill.status === "OVERDUE") && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                          </>
                                        ) : (
                                          <span className="font-mono text-slate-300 group-hover/btn:text-blue-600 group-hover/btn:font-bold">-</span>
                                        )}
                                      </button>
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
                              {registerSearch ? "No students matching your search." : "No students found for this year."}
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

      {/* Bill Status Dialog */}
      <Dialog open={isBillStatusDialogOpen} onOpenChange={setIsBillStatusDialogOpen}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-sm w-full p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">Update Bill Status</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Manually mark this bill as paid or unpaid.
            </DialogDescription>
          </div>
          <form onSubmit={handleUpdateBillStatus}>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Payment Status</Label>
                <Select value={billStatusValue} onValueChange={(val) => setBillStatusValue(val || "PAID")}>
                  <SelectTrigger className="h-9 border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERATED">Unpaid (Generated)</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <Button type="button" variant="ghost" onClick={() => setIsBillStatusDialogOpen(false)} disabled={isUpdatingBill} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingBill} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer">
                {isUpdatingBill ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : "Save Status"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Month Payment Status Dialog */}
      <Dialog open={!!monthEditTarget} onOpenChange={(open) => !open && setMonthEditTarget(null)}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-sm w-full p-0 overflow-hidden">
          {monthEditTarget && (
            <form onSubmit={handleSaveMonthStatus}>
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Receipt className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {monthEditTarget.monthName} {monthEditTarget.year}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 truncate">
                  {monthEditTarget.studentName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Set or update payment status for this month.
                </DialogDescription>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Payment Status Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Payment Status</Label>
                  <Select value={monthStatusValue} onValueChange={(val) => setMonthStatusValue(val || "PAID")}>
                    <SelectTrigger className="h-9 border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          <span>Paid</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="GENERATED">
                        <span className="flex items-center gap-2">
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                          <span>Unpaid (Generated)</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="PARTIALLY_PAID">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span>Partially Paid</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="OVERDUE">
                        <span className="flex items-center gap-2">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Overdue</span>
                        </span>
                      </SelectItem>
                      {monthEditTarget.bill && (
                        <SelectItem value="NOT_BILLED">
                          <span className="flex items-center gap-2 text-slate-500">
                            <span>Unbilled / Remove Record (-)</span>
                          </span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Monthly Amount Field */}
                {monthStatusValue !== "NOT_BILLED" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="monthAmount" className="text-xs font-semibold text-slate-700">
                        Monthly Rent / Bill Amount (₹)
                      </Label>
                      {monthEditTarget.baseRent > 0 && (
                        <span className="text-[11px] text-slate-400">
                          Base: ₹{monthEditTarget.baseRent}
                        </span>
                      )}
                    </div>
                    <Input
                      id="monthAmount"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Enter amount"
                      value={monthAmountValue}
                      onChange={(e) => setMonthAmountValue(e.target.value)}
                      className="h-9 border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
                {monthEditTarget.bill ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!monthEditTarget?.bill) return;
                      const targetBill = monthEditTarget.bill;
                      const hostelObj = hostels.find((h) => h.id === selectedHostel);
                      const amount = monthAmountValue !== "" ? parseFloat(monthAmountValue) : targetBill.amount || monthEditTarget.baseRent;
                      generateInvoicePDF({
                        id: targetBill.id,
                        rentAmount: amount,
                        bedFee: 0,
                        establishmentFee: 0,
                        messCharge: 0,
                        totalAmount: amount,
                        paidAmount: monthStatusValue === "PAID" ? amount : 0,
                        status: monthStatusValue,
                        month: monthEditTarget.month,
                        year: monthEditTarget.year,
                        dueDate: new Date(monthEditTarget.year, monthEditTarget.month - 1, 7),
                        generatedAt: new Date(monthEditTarget.year, monthEditTarget.month - 1, 1),
                        hostel: { name: hostelObj?.name || "Mirror Hostels" },
                        user: {
                          username: monthEditTarget.studentName,
                          studentProfile: { fullName: monthEditTarget.studentName },
                        },
                      });
                    }}
                    className="text-slate-700 border-slate-200 hover:bg-slate-100 rounded-lg h-9 text-xs font-semibold cursor-pointer gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Download Invoice
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setMonthEditTarget(null)}
                    disabled={isUpdatingMonth}
                    className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdatingMonth}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer"
                  >
                    {isUpdatingMonth ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Payment Status"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

