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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hostels</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage hostel properties and capacities.
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium px-4 h-9 gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Hostel
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search hostels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-white border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        /* Skeleton Loader */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-6" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-slate-100 rounded-lg" />
                <div className="h-16 bg-slate-100 rounded-lg" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-full mt-4" />
              <div className="h-9 bg-slate-100 rounded-lg w-full mt-4" />
            </div>
          ))}
        </div>
      ) : filteredHostels.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No hostels found</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-5">
              {search ? "No results match your search." : "Add your first hostel to get started."}
            </p>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add New Hostel
            </Button>
          </div>
        </div>
      ) : (
        /* Hostel Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHostels.map((hostel) => (
            <div
              key={hostel.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden hover:shadow-md hover:ring-slate-300/60 transition-all duration-200 flex flex-col group"
            >
              {/* Accent top bar */}
              <div className="h-1.5 bg-gradient-to-r from-blue-600 to-blue-400 w-full" />

              {/* Card Header */}
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{hostel.name}</h3>
                {hostel.address && (
                  <p className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400 line-clamp-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {hostel.address}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="px-5 pb-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Capacity
                    </p>
                    <p className="text-lg font-bold text-slate-900">{hostel.totalCapacity}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Rooms
                    </p>
                    <p className="text-lg font-bold text-slate-900">{hostel._count?.rooms || 0}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-sm flex items-center justify-between">
                  <span className="text-xs text-slate-400">Manager</span>
                  <span className="text-xs font-medium text-slate-700">
                    {hostel.manager
                      ? hostel.manager.profile?.fullName || hostel.manager.username
                      : <span className="text-slate-400 italic">Unassigned</span>}
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/hostels/${hostel.id}`)}
                  className="w-full rounded-lg h-9 text-sm border-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer"
                >
                  Manage Hostel
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Hostel Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900">Add New Hostel</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Create a new hostel property. You can add rooms and managers later.
            </DialogDescription>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs font-semibold text-slate-600 mb-1.5 block">Hostel Name *</Label>
                <Input id="name" placeholder="E.g. Boys Hostel A" {...register("name")} className="h-9 border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="totalCapacity" className="text-xs font-semibold text-slate-600 mb-1.5 block">Total Capacity (Beds) *</Label>
                <Input id="totalCapacity" type="number" {...register("totalCapacity", { valueAsNumber: true })} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                {errors.totalCapacity && <p className="text-xs text-red-500 mt-1">{errors.totalCapacity.message}</p>}
              </div>
              <div>
                <Label htmlFor="contactNumber" className="text-xs font-semibold text-slate-600 mb-1.5 block">Contact Number</Label>
                <Input id="contactNumber" placeholder="+91 98765 43210" {...register("contactNumber")} className="h-9 border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <Label htmlFor="address" className="text-xs font-semibold text-slate-600 mb-1.5 block">Address</Label>
                <Input id="address" placeholder="Full property address" {...register("address")} className="h-9 border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer">
                {isCreating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                Create Hostel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

