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
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
        fetch(`/api/users?role=HOSTEL_MANAGER`),
        fetch(`/api/users?role=STUDENT`)
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
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
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
            <h1 className="text-3xl font-bold tracking-tight">{hostel.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
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
                        <SelectValue placeholder="Select type" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total Capacity
                <Users className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{stats.totalCapacity}</div>
              <p className="text-xs text-muted-foreground mt-1">Maximum allowed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Occupancy Rate
                <span className="text-emerald-500 font-bold">{stats.occupancyRate}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Progress value={stats.occupancyRate} className="h-2 mt-2 mb-1" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.occupiedBeds} occupied</span>
                <span>{stats.totalBeds} configured beds</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Available Beds
                <BedDouble className="w-4 h-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-amber-600">{stats.vacantBeds}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total Rooms
                <Building2 className="w-4 h-4 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{stats.totalRooms}</div>
              <p className="text-xs text-muted-foreground mt-1">Active physical rooms</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Rooms Configuration</h2>
        {hostel.rooms.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <BedDouble className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium">No rooms added yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Create your first room to start setting up bed assignments.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add First Room
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hostel.rooms.map((room: any) => (
              <Link key={room.id} href={`/admin/hostels/${hostel.id}/rooms/${room.id}/beds`}>
                <Card className="group hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer h-full">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        Room {room.roomNumber}
                      </CardTitle>
                      <span className="text-xs font-medium px-2 py-1 bg-muted rounded-md border">
                        {room.type}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        Floor {room.floor || "-"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BedDouble className="w-3.5 h-3.5" />
                        {room._count.beds} Beds
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="managers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Hostel Manager Section */}
            <Card>
              <CardHeader>
                <CardTitle>Hostel Manager</CardTitle>
                <CardDescription>Assign a staff member or student to manage this hostel permanently.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedHostelManager} onValueChange={setSelectedHostelManager}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select staff or student..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled className="font-semibold text-muted-foreground">Staff</SelectItem>
                      {staffUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.studentProfile?.fullName || user.username} ({user.email})
                        </SelectItem>
                      ))}
                      <SelectItem value="none2" disabled className="font-semibold text-muted-foreground mt-2 border-t pt-2">Students</SelectItem>
                      {studentUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.studentProfile?.fullName || user.username} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={assignHostelManager} disabled={isAssigningManager || !selectedHostelManager}>
                    {isAssigningManager ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                  </Button>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Assignment History</h4>
                  <div className="space-y-3">
                    {hostelManagers.map((assignment: any) => (
                      <div key={assignment.id} className={`p-3 border rounded-lg flex justify-between items-center ${assignment.isActive ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
                        <div>
                          <p className="font-medium">{assignment.user.studentProfile?.fullName || assignment.user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {assignment.isActive ? (
                            <>
                              <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                                Active
                              </span>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-6 text-xs px-2"
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
                            <span className="text-xs font-semibold px-2 py-1 bg-muted text-muted-foreground rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {hostelManagers.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No managers assigned yet.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Manager Section */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Manager</CardTitle>
                <CardDescription>Appoint a student to manage the mess for a specific month.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Month</Label>
                    <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <SelectItem key={i+1} value={(i+1).toString()}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Year</Label>
                    <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
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
                  <Select value={selectedMonthlyManager} onValueChange={setSelectedMonthlyManager}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {studentUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.studentProfile?.fullName || user.username} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={assignMonthlyManager} disabled={isAssigningManager || !selectedMonthlyManager}>
                    {isAssigningManager ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                  </Button>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Sessions</h4>
                  <div className="space-y-3">
                    {monthlyManagers.map((session: any) => (
                      <div key={session.id} className="p-3 border rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">
                            {new Date(0, session.month - 1).toLocaleString('default', { month: 'long' })} {session.year}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Manager: {session.user.studentProfile?.fullName || session.user.username}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.isActive ? (
                            <>
                              <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                                Active
                              </span>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-6 text-xs px-2"
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
                            <span className="text-xs font-semibold px-2 py-1 bg-muted text-muted-foreground rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {monthlyManagers.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No monthly managers appointed yet.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
