"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, 
  ArrowLeft, 
  BedDouble, 
  MapPin, 
  Phone, 
  Users, 
  Plus, 
  Loader2, 
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const createRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  type: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "DORMITORY"]),
  floor: z.number().int().optional(),
});

type CreateRoomFormData = z.infer<typeof createRoomSchema>;

export default function HostelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [hostel, setHostel] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [hostelManagers, setHostelManagers] = useState<any[]>([]);
  const [monthlyManagers, setMonthlyManagers] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [studentUsers, setStudentUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isUpdatingHostel, setIsUpdatingHostel] = useState(false);
  const [isAssigningManager, setIsAssigningManager] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateRoomFormData>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { type: "DOUBLE", floor: 1 }
  });

  const {
    register: registerSettings,
    handleSubmit: handleSubmitSettings,
    reset: resetSettings,
    formState: { errors: errorsSettings },
  } = useForm({
    defaultValues: {
      name: "",
      address: "",
      contactNumber: "",
      totalCapacity: 0,
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [hostelRes, statsRes, hManagersRes, mManagersRes, staffRes, studentsRes] = await Promise.all([
        fetch(`/api/hostels/${resolvedParams.id}`),
        fetch(`/api/hostels/${resolvedParams.id}/occupancy`),
        fetch(`/api/hostels/${resolvedParams.id}/managers`),
        fetch(`/api/hostels/${resolvedParams.id}/monthly-managers`),
        fetch(`/api/users?role=HOSTEL_MANAGER,SUPER_ADMIN`),
        fetch(`/api/users?role=STUDENT,MONTHLY_MANAGER`)
      ]);
      
      if (!hostelRes.ok) throw new Error("Failed to fetch hostel");
      
      const hostelData = await hostelRes.json();
      const statsData = await statsRes.json();
      const hManagersData = await hManagersRes.json();
      const mManagersData = await mManagersRes.json();
      const staffData = await staffRes.json();
      const studentsData = await studentsRes.json();
      
      setHostel(hostelData.data);
      setStats(statsData.data);
      setHostelManagers(hManagersData.data || []);
      setMonthlyManagers(mManagersData.data || []);
      setStaffUsers(staffData.data || []);
      setStudentUsers(studentsData.data || []);
      resetSettings({
        name: hostelData.data.name,
        address: hostelData.data.address || "",
        contactNumber: hostelData.data.contactNumber || "",
        totalCapacity: hostelData.data.totalCapacity,
      });
    } catch (error) {
      toast.error("Could not load hostel details");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmitRoom(data: CreateRoomFormData) {
    setIsCreatingRoom(true);
    try {
      const res = await fetch(`/api/hostels/${resolvedParams.id}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Room added successfully!");
      setIsDialogOpen(false);
      reset();
      fetchData(); // Refresh list
    } catch (error: any) {
      toast.error(error.message || "Failed to add room");
    } finally {
      setIsCreatingRoom(false);
    }
  }

  async function onSubmitSettings(data: any) {
    setIsUpdatingHostel(true);
    try {
      const payload = {
        ...data,
        totalCapacity: parseInt(data.totalCapacity),
      };
      const res = await fetch(`/api/hostels/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Hostel settings updated successfully!");
      setIsSettingsOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update hostel");
    } finally {
      setIsUpdatingHostel(false);
    }
  }

  const [selectedHostelManager, setSelectedHostelManager] = useState("");
  const [selectedMonthlyManager, setSelectedMonthlyManager] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  async function assignHostelManager() {
    if (!selectedHostelManager) return toast.error("Select a manager first");
    setIsAssigningManager(true);
    try {
      const res = await fetch(`/api/hostels/${resolvedParams.id}/managers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedHostelManager })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Hostel manager assigned!");
      setSelectedHostelManager("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign manager");
    } finally {
      setIsAssigningManager(false);
    }
  }

  async function assignMonthlyManager() {
    if (!selectedMonthlyManager) return toast.error("Select a student first");
    setIsAssigningManager(true);
    try {
      const res = await fetch(`/api/hostels/${resolvedParams.id}/monthly-managers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedMonthlyManager, month: selectedMonth, year: selectedYear })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Monthly manager assigned!");
      setSelectedMonthlyManager("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign monthly manager");
    } finally {
      setIsAssigningManager(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!hostel) {
    return <div className="text-center py-12">Hostel not found</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/hostels")} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{hostel.name}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
              {hostel.address && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {hostel.address}</span>
              )}
              {hostel.contactNumber && (
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {hostel.contactNumber}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Hostel Settings</DialogTitle>
                <DialogDescription>
                  Update the basic details of this hostel.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitSettings(onSubmitSettings)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Hostel Name *</Label>
                  <Input id="name" {...registerSettings("name", { required: "Name is required" })} />
                  {errorsSettings.name && <p className="text-xs text-destructive">{String(errorsSettings.name.message)}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...registerSettings("address")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input id="contactNumber" {...registerSettings("contactNumber")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalCapacity">Total Capacity</Label>
                    <Input id="totalCapacity" type="number" {...registerSettings("totalCapacity", { min: 1 })} />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isUpdatingHostel}>
                    {isUpdatingHostel ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setIsDialogOpen(true)} className="cursor-pointer shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Add Room
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
                <DialogDescription>
                  Create a new room in this hostel. You can assign beds to it afterwards.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmitRoom)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="roomNumber">Room Number/Label *</Label>
                  <Input id="roomNumber" placeholder="e.g. 101, 102A" {...register("roomNumber")} />
                  {errors.roomNumber && <p className="text-xs text-destructive">{errors.roomNumber.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Room Type *</Label>
                    <Select defaultValue="DOUBLE" onValueChange={(v: any) => setValue("type", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type">
                          {watch("type") === "SINGLE" ? "Single" :
                           watch("type") === "DOUBLE" ? "Double" :
                           watch("type") === "TRIPLE" ? "Triple" :
                           watch("type") === "DORMITORY" ? "Dormitory" : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="DOUBLE">Double</SelectItem>
                        <SelectItem value="TRIPLE">Triple</SelectItem>
                        <SelectItem value="DORMITORY">Dormitory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">Floor Number</Label>
                    <Input id="floor" type="number" {...register("floor", { valueAsNumber: true })} />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isCreatingRoom} className="w-full">
                    {isCreatingRoom ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Room"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview & Rooms</TabsTrigger>
          <TabsTrigger value="managers">Managers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Total Capacity</h3>
            </div>
            <div className="p-5">
              <div className="text-2xl font-bold text-slate-900">{stats.totalCapacity}</div>
              <p className="text-xs text-slate-400 mt-1">Maximum allowed beds</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-slate-800">Occupancy Rate</h3>
              </div>
              <span className="text-sm font-bold text-green-600">{stats.occupancyRate}%</span>
            </div>
            <div className="p-5">
              <Progress value={stats.occupancyRate} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{stats.occupiedBeds} occupied</span>
                <span>{stats.totalBeds} configured beds</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <BedDouble className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Available Beds</h3>
            </div>
            <div className="p-5">
              <div className="text-2xl font-bold text-amber-600">{stats.vacantBeds}</div>
              <p className="text-xs text-slate-400 mt-1">Ready for assignment</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Total Rooms</h3>
            </div>
            <div className="p-5">
              <div className="text-2xl font-bold text-slate-900">{stats.totalRooms}</div>
              <p className="text-xs text-slate-400 mt-1">Active physical rooms</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Rooms Configuration</h2>
        {hostel.rooms.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <BedDouble className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No rooms added yet</h3>
            <p className="text-slate-500 text-xs mt-1 mb-4">
              Create your first room to start setting up bed assignments.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add First Room
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {hostel.rooms.map((room: any) => (
              <Link key={room.id} href={`/admin/hostels/${hostel.id}/rooms/${room.id}/beds`} className="block">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full group">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Room {room.roomNumber}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200 uppercase tracking-wider">
                      {room.type}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        Floor {room.floor || "-"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BedDouble className="w-4 h-4 text-slate-400" />
                        {room._count.beds} Beds
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="managers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Hostel Manager Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Hostel Manager</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Assign a staff member or student to manage this hostel permanently.</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedHostelManager} onValueChange={(val) => { if (val) setSelectedHostelManager(val); }}>
                    <SelectTrigger className="w-full bg-white border-slate-200 rounded-lg text-sm">
                      <SelectValue placeholder="Select staff or student...">
                        {(() => {
                          if (!selectedHostelManager) return null;
                          const user = [...staffUsers, ...studentUsers].find(u => u.id === selectedHostelManager);
                          return user ? `${user.studentProfile?.fullName || user.username} (${user.email})` : null;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled className="font-semibold text-slate-500">Staff</SelectItem>
                      {staffUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.studentProfile?.fullName || user.username} ({user.email})
                        </SelectItem>
                      ))}
                      <SelectItem value="none2" disabled className="font-semibold text-slate-500 mt-2 border-t pt-2">Students</SelectItem>
                      {studentUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.studentProfile?.fullName || user.username} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={assignHostelManager} disabled={isAssigningManager || !selectedHostelManager} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
                    {isAssigningManager ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                  </Button>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Assignment History</h4>
                  <div className="space-y-3">
                    {hostelManagers.map((assignment: any) => (
                      <div key={assignment.id} className={`p-4 border rounded-xl flex justify-between items-center ${assignment.isActive ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{assignment.user.studentProfile?.fullName || assignment.user.username}</p>
                          <p className="text-xs text-slate-500">
                            Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {assignment.isActive ? (
                            <>
                              <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-md border border-green-200 uppercase tracking-wider">
                                Active
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 border-red-200 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                onClick={async () => {
                                  if (!confirm("Are you sure you want to remove this manager?")) return;
                                  try {
                                    const res = await fetch(`/api/hostels/${resolvedParams.id}/managers/${assignment.id}`, { method: "DELETE" });
                                    if (!res.ok) throw new Error("Failed to remove manager");
                                    toast.success("Manager removed successfully");
                                    fetchData();
                                  } catch (e: any) {
                                    toast.error(e.message);
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200 uppercase tracking-wider">
                                Inactive
                              </span>
                              {assignment.user.role === "HOSTEL_MANAGER" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs px-2.5 border-amber-200 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                                  onClick={async () => {
                                    if (!confirm(`Downgrade ${assignment.user.studentProfile?.fullName || assignment.user.username} back to Student?`)) return;
                                    try {
                                      const res = await fetch(`/api/users/${assignment.user.id}/downgrade`, { method: "POST" });
                                      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
                                      toast.success("User downgraded to Student");
                                      fetchData();
                                    } catch (e: any) {
                                      toast.error(e.message);
                                    }
                                  }}
                                >
                                  Downgrade
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {hostelManagers.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No managers assigned yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Manager Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Monthly Manager</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Appoint a student to manage the mess for a specific month.</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Month</Label>
                    <Select value={selectedMonth.toString()} onValueChange={v => { if (v) setSelectedMonth(parseInt(v)) }}>
                      <SelectTrigger className="bg-white border-slate-200 rounded-lg text-sm">
                        <SelectValue placeholder="Month">
                          {selectedMonth ? new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' }) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <SelectItem key={i+1} value={(i+1).toString()}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Year</Label>
                    <Select value={selectedYear.toString()} onValueChange={v => { if (v) setSelectedYear(parseInt(v)) }}>
                      <SelectTrigger className="bg-white border-slate-200 rounded-lg text-sm">
                        <SelectValue placeholder="Year">
                          {selectedYear}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2].map(offset => {
                          const year = new Date().getFullYear() + offset - 1;
                          return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Select value={selectedMonthlyManager} onValueChange={(val) => { if (val) setSelectedMonthlyManager(val); }}>
                    <SelectTrigger className="w-full bg-white border-slate-200 rounded-lg text-sm">
                      <SelectValue placeholder="Select student...">
                        {(() => {
                          if (!selectedMonthlyManager) return null;
                          const user = studentUsers.find(u => u.id === selectedMonthlyManager);
                          return user ? `${user.studentProfile?.fullName || user.username} (${user.email})` : null;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {studentUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.studentProfile?.fullName || user.username} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={assignMonthlyManager} disabled={isAssigningManager || !selectedMonthlyManager} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
                    {isAssigningManager ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                  </Button>
                </div>

                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Sessions</h4>
                  <div className="space-y-3">
                    {monthlyManagers.map((session: any) => (
                      <div key={session.id} className="p-4 border rounded-xl flex justify-between items-center bg-slate-50/50 border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {new Date(0, session.month - 1).toLocaleString('default', { month: 'long' })} {session.year}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Manager: <span className="font-medium text-slate-700">{session.user.studentProfile?.fullName || session.user.username}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.isActive ? (
                            <>
                              <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-md border border-green-200 uppercase tracking-wider">
                                Active
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 border-red-200 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                onClick={async () => {
                                  if (!confirm("Are you sure you want to remove this monthly manager?")) return;
                                  try {
                                    const res = await fetch(`/api/hostels/${resolvedParams.id}/monthly-managers/${session.id}`, { method: "DELETE" });
                                    if (!res.ok) throw new Error("Failed to remove monthly manager");
                                    toast.success("Monthly manager removed successfully");
                                    fetchData();
                                  } catch (e: any) {
                                    toast.error(e.message);
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200 uppercase tracking-wider">
                                Completed
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 border-red-200 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                onClick={async () => {
                                  if (!confirm("Are you sure you want to remove this monthly manager?")) return;
                                  try {
                                    const res = await fetch(`/api/hostels/${resolvedParams.id}/monthly-managers/${session.id}`, { method: "DELETE" });
                                    if (!res.ok) throw new Error("Failed to remove monthly manager");
                                    toast.success("Monthly manager removed successfully");
                                    fetchData();
                                  } catch (e: any) {
                                    toast.error(e.message);
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {monthlyManagers.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No monthly managers appointed yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
