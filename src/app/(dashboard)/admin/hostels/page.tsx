"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Users, 
  Loader2, 
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const createHostelSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  totalCapacity: z.number().int().min(1, "Capacity must be at least 1"),
});

type CreateHostelFormData = z.infer<typeof createHostelSchema>;

export default function AdminHostelsPage() {
  const router = useRouter();
  const [hostels, setHostels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateHostelFormData>({
    resolver: zodResolver(createHostelSchema),
    defaultValues: {
      totalCapacity: 50,
    }
  });

  useEffect(() => {
    fetchHostels();
  }, []);

  async function fetchHostels() {
    try {
      const res = await fetch("/api/hostels");
      if (!res.ok) throw new Error("Failed to fetch hostels");
      const { data } = await res.json();
      setHostels(data);
    } catch (error) {
      toast.error("Could not load hostels");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: CreateHostelFormData) {
    setIsCreating(true);
    try {
      const res = await fetch("/api/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Hostel created successfully!");
      setIsDialogOpen(false);
      reset();
      fetchHostels();
    } catch (error: any) {
      toast.error(error.message || "Failed to create hostel");
    } finally {
      setIsCreating(false);
    }
  }

  const filteredHostels = hostels.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hostels</h1>
          <p className="text-muted-foreground mt-1">
            Manage hostel properties and capacities.
          </p>
        </div>

        <Button onClick={() => setIsDialogOpen(true)} className="cursor-pointer shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          Add New Hostel
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Hostel</DialogTitle>
              <DialogDescription>
                Create a new hostel property. You can add rooms and managers later.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Hostel Name *</Label>
                <Input id="name" placeholder="E.g. Boys Hostel A" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalCapacity">Total Capacity (Beds) *</Label>
                <Input id="totalCapacity" type="number" {...register("totalCapacity", { valueAsNumber: true })} />
                {errors.totalCapacity && <p className="text-xs text-destructive">{errors.totalCapacity.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input id="contactNumber" placeholder="+91 98765 43210" {...register("contactNumber")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Full property address" {...register("address")} />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isCreating} className="w-full">
                  {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Hostel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search hostels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredHostels.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-dashed">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-medium">No hostels found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {search ? "No results match your search." : "Add your first hostel to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHostels.map((hostel) => (
            <Card key={hostel.id} className="group hover:border-primary/50 transition-colors shadow-sm overflow-hidden flex flex-col">
              <div className="h-2 bg-gradient-to-r from-primary/80 to-primary/40 w-full" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl line-clamp-1">{hostel.name}</CardTitle>
                </div>
                {hostel.address && (
                  <CardDescription className="flex items-center gap-1.5 mt-2 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {hostel.address}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Total Capacity
                    </p>
                    <p className="text-lg font-semibold">{hostel.totalCapacity}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Active Rooms
                    </p>
                    <p className="text-lg font-semibold">{hostel._count?.rooms || 0}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t text-sm flex items-center justify-between">
                  <span className="text-muted-foreground">Manager</span>
                  <span className="font-medium">
                    {hostel.manager ? hostel.manager.profile?.fullName || hostel.manager.username : <span className="text-muted-foreground italic">Unassigned</span>}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/20 border-t p-4">
                <Button variant="secondary" onClick={() => router.push(`/admin/hostels/${hostel.id}`)} className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  Manage Hostel
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
