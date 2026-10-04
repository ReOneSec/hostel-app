"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft, 
  BedDouble, 
  Plus, 
  Loader2, 
  User,
  Trash2,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardGridSkeleton } from "@/components/skeletons/page-skeletons";

const createBedSchema = z.object({
  bedLabel: z.string().min(1, "Bed label is required"),
});

const updateRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room name is required"),
  type: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "DORMITORY"]),
});

type CreateBedFormData = z.infer<typeof createBedSchema>;
type UpdateRoomFormData = z.infer<typeof updateRoomSchema>;

export default function RoomBedsPage({ params }: { params: Promise<{ id: string; roomId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<any>(null);
  const [beds, setBeds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [isCreatingBed, setIsCreatingBed] = useState(false);
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBedFormData>({
    resolver: zodResolver(createBedSchema),
  });

  const {
    register: registerRoom,
    handleSubmit: handleSubmitRoom,
    setValue: setRoomValue,
    watch: watchRoom,
    reset: resetRoom,
    formState: { errors: roomErrors },
  } = useForm<UpdateRoomFormData>({
    resolver: zodResolver(updateRoomSchema),
  });

  useEffect(() => {
    fetchBeds();
  }, []);

  async function fetchBeds() {
    try {
      const [roomRes, bedsRes] = await Promise.all([
        fetch(`/api/hostels/${resolvedParams.id}/rooms/${resolvedParams.roomId}`),
        fetch(`/api/hostels/${resolvedParams.id}/rooms/${resolvedParams.roomId}/beds`)
      ]);
      
      if (!roomRes.ok) throw new Error("Failed to fetch room");
      if (!bedsRes.ok) throw new Error("Failed to fetch beds");
      
      const roomJson = await roomRes.json();
      const bedsJson = await bedsRes.json();
      
      setRoom(roomJson.data);
      setBeds(bedsJson.data);
      
      resetRoom({
        roomNumber: roomJson.data.roomNumber,
        type: roomJson.data.roomType,
      });
    } catch (error) {
      toast.error("Could not load data");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmitUpdateRoom(data: UpdateRoomFormData) {
    setIsUpdatingRoom(true);
    try {
      const res = await fetch(`/api/hostels/${resolvedParams.id}/rooms/${resolvedParams.roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Room updated successfully!");
      setIsEditRoomOpen(false);
      fetchBeds(); // Refresh data
    } catch (error: any) {
      toast.error(error.message || "Failed to update room");
    } finally {
      setIsUpdatingRoom(false);
    }
  }

  async function onSubmitBed(data: CreateBedFormData) {
    setIsCreatingBed(true);
    try {
      const res = await fetch(`/api/hostels/${resolvedParams.id}/rooms/${resolvedParams.roomId}/beds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Bed added successfully!");
      setIsDialogOpen(false);
      reset();
      fetchBeds(); // Refresh list
    } catch (error: any) {
      toast.error(error.message || "Failed to add bed");
    } finally {
      setIsCreatingBed(false);
    }
  }

  async function deleteBed(bedId: string) {
    if (!confirm("Are you sure you want to remove this bed?")) return;
    try {
      const res = await fetch(`/api/hostels/${resolvedParams.id}/rooms/${resolvedParams.roomId}/beds/${bedId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Bed removed successfully!");
      fetchBeds();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove bed");
    }
  }

  if (isLoading) {
    return <CardGridSkeleton cards={4} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/hostels/${resolvedParams.id}`)} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              Room {room?.roomNumber || "Configuration"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage beds and view current occupants in this room.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditRoomOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="cursor-pointer shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Add Bed
          </Button>
        </div>
        
        <Dialog open={isEditRoomOpen} onOpenChange={setIsEditRoomOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
              <DialogDescription>
                Update the room's name and type.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitRoom(onSubmitUpdateRoom)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Room Name/Number *</Label>
                <Input id="roomNumber" {...registerRoom("roomNumber")} />
                {roomErrors.roomNumber && <p className="text-xs text-destructive">{roomErrors.roomNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Room Type *</Label>
                <Select value={watchRoom("type")} onValueChange={(v: any) => setRoomValue("type", v)}>
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
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isUpdatingRoom} className="w-full">
                  {isUpdatingRoom ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Bed</DialogTitle>
              <DialogDescription>
                Create a new bed slot in this room.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmitBed)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bedLabel">Bed Label *</Label>
                <Input id="bedLabel" placeholder="e.g. A, B, 1, 2" {...register("bedLabel")} autoFocus />
                {errors.bedLabel && <p className="text-xs text-destructive">{errors.bedLabel.message}</p>}
                <p className="text-xs text-muted-foreground">Keep it short (e.g. "A" or "1").</p>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isCreatingBed} className="w-full">
                  {isCreatingBed ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Bed"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {beds.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-card rounded-xl border border-dashed">
            <BedDouble className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium">No beds in this room</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Add the first bed to start assigning students.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add Bed
            </Button>
          </div>
        ) : (
          beds.map((bed) => {
            const activeAssignment = bed.bedAssignments?.[0];
            const isOccupied = !!activeAssignment;

            return (
              <Card key={bed.id} className={`overflow-hidden transition-all ${isOccupied ? 'border-primary/20 bg-primary/5' : ''}`}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BedDouble className={`w-5 h-5 ${isOccupied ? 'text-primary' : 'text-muted-foreground'}`} />
                      Bed {bed.bedLabel}
                    </CardTitle>
                    {isOccupied ? (
                      <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-transparent shadow-none">Occupied</Badge>
                    ) : (
                      <Badge variant="outline" className="border-dashed bg-muted/50 text-muted-foreground">Vacant</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {isOccupied ? (
                    <div className="flex flex-col gap-2 p-3 bg-background rounded-md border shadow-sm mt-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        {activeAssignment.user.profile?.fullName || 'Unknown Student'}
                      </div>
                      <Link href={`/admin/users/${activeAssignment.userId}`} className="text-xs text-primary hover:underline ml-8">
                        View Profile
                      </Link>
                    </div>
                  ) : (
                    <div className="h-[76px] flex items-center justify-center border border-dashed rounded-md mt-2 bg-muted/20">
                      <span className="text-xs text-muted-foreground">Available for assignment</span>
                    </div>
                  )}
                </CardContent>
                {!isOccupied && (
                  <CardFooter className="p-4 pt-0 justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      onClick={() => deleteBed(bed.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Remove
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
