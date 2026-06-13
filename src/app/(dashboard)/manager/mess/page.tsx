"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Settings, ArrowRight, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MessManagerDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  
  // Modals
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  
  // Forms
  const [configForm, setConfigForm] = useState({
    cookPayment: 0,
    cleanerPayment: 0,
    dustbinPayment: 0,
    guestMealRate: 65
  });
  
  const [sessionForm, setSessionForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    monthlyManagerUserId: ""
  });

  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session]);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Find the hostel ID for this manager
      const resHostel = await fetch("/api/hostels");
      const hostelsData = await resHostel.json();
      const myHostel = hostelsData.data?.[0]?.id; // Simplification, assume managing 1 hostel

      if (!myHostel) {
        toast.error("You are not assigned to any hostel");
        return;
      }

      // Fetch config
      const resConfig = await fetch(`/api/mess/config?hostelId=${myHostel}`);
      const configData = await resConfig.json();
      setConfig(configData.data);
      if (configData.data) {
        setConfigForm({
          cookPayment: parseFloat(configData.data.cookPayment) || 0,
          cleanerPayment: parseFloat(configData.data.cleanerPayment) || 0,
          dustbinPayment: parseFloat(configData.data.dustbinPayment) || 0,
          guestMealRate: parseFloat(configData.data.guestMealRate) || 65
        });
      }

      // Fetch sessions
      const resSessions = await fetch(`/api/mess/sessions?hostelId=${myHostel}`);
      const sessionsData = await resSessions.json();
      setSessions(sessionsData.data || []);

      // Fetch students for monthly manager dropdown
      const resStudents = await fetch(`/api/hostels/${myHostel}/students`);
      const studentsData = await resStudents.json();
      setStudents(studentsData.data || []);

    } catch (e) {
      toast.error("Failed to load mess data");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateConfig(e: React.FormEvent) {
    e.preventDefault();
    try {
      const resHostel = await fetch("/api/hostels");
      const hostelsData = await resHostel.json();
      const myHostel = hostelsData.data?.[0]?.id;
      
      const res = await fetch("/api/mess/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: myHostel,
          ...configForm
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Mess configuration updated");
      setIsConfigOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function startSession(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!config) {
        toast.error("Please configure the Mess Settings (Cook salary, etc.) first");
        return;
      }

      const resHostel = await fetch("/api/hostels");
      const hostelsData = await resHostel.json();
      const myHostel = hostelsData.data?.[0]?.id;
      
      const res = await fetch("/api/mess/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: myHostel,
          month: sessionForm.month,
          year: sessionForm.year,
          monthlyManagerUserId: sessionForm.monthlyManagerUserId || undefined
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Mess session started");
      setIsNewSessionOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mess Accounting</h1>
          <p className="text-muted-foreground mt-1">Manage monthly mess sessions, expenses, and settlements.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings className="w-4 h-4 mr-2" /> Settings</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mess Configuration</DialogTitle>
              </DialogHeader>
              <form onSubmit={updateConfig} className="space-y-4 pt-4">
                <div className="grid gap-2">
                  <Label>Cook Monthly Salary (₹)</Label>
                  <Input type="number" value={configForm.cookPayment} onChange={e => setConfigForm({...configForm, cookPayment: parseFloat(e.target.value)})} required />
                </div>
                <div className="grid gap-2">
                  <Label>Cleaner Monthly Salary (₹)</Label>
                  <Input type="number" value={configForm.cleanerPayment} onChange={e => setConfigForm({...configForm, cleanerPayment: parseFloat(e.target.value)})} required />
                </div>
                <div className="grid gap-2">
                  <Label>Dustbin/Waste Monthly Salary (₹)</Label>
                  <Input type="number" value={configForm.dustbinPayment} onChange={e => setConfigForm({...configForm, dustbinPayment: parseFloat(e.target.value)})} required />
                </div>
                <div className="grid gap-2">
                  <Label>Guest Meal Rate (₹/meal)</Label>
                  <Input type="number" value={configForm.guestMealRate} onChange={e => setConfigForm({...configForm, guestMealRate: parseFloat(e.target.value)})} required />
                </div>
                <Button type="submit" className="w-full">Save Configuration</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Start New Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Mess Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={startSession} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Month</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                      value={sessionForm.month} onChange={e => setSessionForm({...sessionForm, month: parseInt(e.target.value)})} required>
                      {Array.from({length: 12}).map((_, i) => (
                        <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Year</Label>
                    <Input type="number" value={sessionForm.year} onChange={e => setSessionForm({...sessionForm, year: parseInt(e.target.value)})} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Monthly Student Manager (Optional)</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={sessionForm.monthlyManagerUserId} onChange={e => setSessionForm({...sessionForm, monthlyManagerUserId: e.target.value})}>
                    <option value="">-- No Student Manager --</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.fullName || s.email}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full">Create Session</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mess Sessions</CardTitle>
          <CardDescription>All historical and active mess accounting sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No mess sessions found.</p>
              <p className="text-sm">Click "Start New Session" to begin accounting.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month/Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Meal Rate</TableHead>
                  <TableHead>Docs / Guests</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {new Date(s.year, s.month - 1).toLocaleString('default', { month: 'long' })} {s.year}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "CLOSED" ? "secondary" : "default"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.totalMessCharge1 ? `₹${s.totalMessCharge1}` : "-"}
                    </TableCell>
                    <TableCell>
                      {s.universalMealCharge ? `₹${s.universalMealCharge}` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{s._count.documents} docs</span>
                        <span>{s._count.guestMeals} guests</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/manager/mess/${s.id}`)}>
                        Manage <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
