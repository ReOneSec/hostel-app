"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AssignStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [hostels, setHostels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  
  const [selectedHostel, setSelectedHostel] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedBed, setSelectedBed] = useState("");
  const [notes, setNotes] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedHostel) {
      fetchRooms(selectedHostel);
      setSelectedRoom("");
      setSelectedBed("");
    }
  }, [selectedHostel]);

  useEffect(() => {
    if (selectedHostel && selectedRoom) {
      fetchBeds(selectedHostel, selectedRoom);
      setSelectedBed("");
    }
  }, [selectedRoom]);

  async function fetchData() {
    try {
      // Fetch user to check if they have an active assignment
      const userRes = await fetch(`/api/users/${resolvedParams.id}`);
      if (!userRes.ok) throw new Error("Failed to fetch user");
      const { data: userData } = await userRes.json();
      setUser(userData);

      // Fetch hostels
      const hostelsRes = await fetch("/api/hostels");
      if (!hostelsRes.ok) throw new Error("Failed to fetch hostels");
      const { data: hostelsData } = await hostelsRes.json();
      setHostels(hostelsData);
      
    } catch (error) {
      toast.error("Error loading data");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchRooms(hostelId: string) {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/rooms`);
      if (res.ok) {
        const { data } = await res.json();
        setRooms(data);
      }
    } catch (error) {
      toast.error("Failed to fetch rooms");
    }
  }

  async function fetchBeds(hostelId: string, roomId: string) {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/rooms/${roomId}/beds`);
      if (res.ok) {
        const { data } = await res.json();
        // Only show active and available (unoccupied) beds
        const availableBeds = data.filter((bed: any) => 
          bed.isActive && (!bed.bedAssignments || bed.bedAssignments.length === 0)
        );
        setBeds(availableBeds);
      }
    } catch (error) {
      toast.error("Failed to fetch beds");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHostel || !selectedRoom || !selectedBed) {
      toast.error("Please select a hostel, room, and bed.");
      return;
    }

    const hasActiveAssignment = user?.hostelAssignments?.length > 0;
    const endpoint = hasActiveAssignment 
      ? `/api/users/${user.id}/transfer` 
      : `/api/users/${user.id}/assign`;
      
    const payload = hasActiveAssignment 
      ? { newHostelId: selectedHostel, newRoomId: selectedRoom, newBedId: selectedBed, transferReason: notes }
      : { hostelId: selectedHostel, roomId: selectedRoom, bedId: selectedBed, notes };

    setIsSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to process assignment");
      
      toast.success(hasActiveAssignment ? "Student transferred successfully!" : "Student assigned successfully!");
      router.push(`/admin/users/${user.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasActiveAssignment = user?.hostelAssignments?.length > 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/users/${user.id}`)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {hasActiveAssignment ? "Transfer Student" : "Assign Student"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.studentProfile?.fullName || user?.username} ({user?.email})
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{hasActiveAssignment ? "Transfer Details" : "Assignment Details"}</CardTitle>
            <CardDescription>
              {hasActiveAssignment 
                ? "Select the new hostel, room, and bed for this student."
                : "Select the hostel, room, and bed to assign to this student."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {hasActiveAssignment && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-sm mb-4">
                <strong>Current Assignment:</strong> {user.hostelAssignments[0].hostel.name}, Room {user.roomAssignments?.[0]?.room.roomNumber}, Bed {user.bedAssignments?.[0]?.bed.bedLabel}
                <br className="my-1"/>
                <em>Note: Transferring will immediately invalidate the student&apos;s current selfie and require them to upload a new one.</em>
              </div>
            )}

            <div className="space-y-2">
              <Label>Hostel</Label>
              <Select value={selectedHostel} onValueChange={(val) => setSelectedHostel(val || "")} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a hostel" />
                </SelectTrigger>
                <SelectContent>
                  {hostels.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={selectedRoom} onValueChange={(val) => setSelectedRoom(val || "")} disabled={!selectedHostel || rooms.length === 0} required>
                <SelectTrigger>
                  <SelectValue placeholder={!selectedHostel ? "Select a hostel first" : rooms.length === 0 ? "No rooms available" : "Select a room"} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>Room {r.roomNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bed</Label>
              <Select value={selectedBed} onValueChange={(val) => setSelectedBed(val || "")} disabled={!selectedRoom || beds.length === 0} required>
                <SelectTrigger>
                  <SelectValue placeholder={!selectedRoom ? "Select a room first" : beds.length === 0 ? "No available beds in this room" : "Select a bed"} />
                </SelectTrigger>
                <SelectContent>
                  {beds.map(b => (
                    <SelectItem key={b.id} value={b.id}>Bed {b.bedLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{hasActiveAssignment ? "Transfer Reason" : "Additional Notes"}</Label>
              <Textarea 
                placeholder={hasActiveAssignment ? "Why is this student transferring?" : "Any additional notes..."}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                required={hasActiveAssignment}
                className="resize-none"
              />
            </div>
            
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/admin/users/${user.id}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {hasActiveAssignment ? "Confirm Transfer" : "Confirm Assignment"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
