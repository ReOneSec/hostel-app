"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Settings, ArrowRight, BookOpen, UtensilsCrossed, Calendar, FileText, Users, Receipt, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

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
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-400 mt-3">Loading mess data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mess Accounting</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage monthly mess sessions, expenses, and settlements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger render={<Button variant="outline" className="h-9 px-3 text-sm text-slate-600 border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 cursor-pointer" />}>
              <Settings className="w-4 h-4 mr-2" /> Settings
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <DialogTitle className="text-base font-bold text-slate-900">Mess Configuration</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">Set the baseline salary and rate parameters for the mess.</DialogDescription>
              </div>
              <form onSubmit={updateConfig}>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Cook Monthly Salary (₹)</Label>
                    <Input 
                      type="number" min="0" step="0.01" 
                      value={configForm.cookPayment} 
                      onChange={e => setConfigForm({...configForm, cookPayment: parseFloat(e.target.value)})} 
                      required 
                      className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Cleaner Monthly Salary (₹)</Label>
                    <Input 
                      type="number" min="0" step="0.01" 
                      value={configForm.cleanerPayment} 
                      onChange={e => setConfigForm({...configForm, cleanerPayment: parseFloat(e.target.value)})} 
                      required 
                      className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Dustbin/Waste Monthly Salary (₹)</Label>
                    <Input 
                      type="number" min="0" step="0.01" 
                      value={configForm.dustbinPayment} 
                      onChange={e => setConfigForm({...configForm, dustbinPayment: parseFloat(e.target.value)})} 
                      required 
                      className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Guest Meal Rate (₹/meal)</Label>
                    <Input 
                      type="number" min="0" step="0.01" 
                      value={configForm.guestMealRate} 
                      onChange={e => setConfigForm({...configForm, guestMealRate: parseFloat(e.target.value)})} 
                      required 
                      className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                  <Button type="button" variant="ghost" onClick={() => setIsConfigOpen(false)} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                    Save Configuration
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
            <DialogTrigger render={<Button className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer" />}>
              <Plus className="w-4 h-4 mr-2" /> Start New Session
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <DialogTitle className="text-base font-bold text-slate-900">Start Mess Session</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">Initialize a new monthly accounting session.</DialogDescription>
              </div>
              <form onSubmit={startSession}>
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Month</Label>
                      <select 
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" 
                        value={sessionForm.month} 
                        onChange={e => setSessionForm({...sessionForm, month: parseInt(e.target.value)})} 
                        required
                      >
                        {Array.from({length: 12}).map((_, i) => (
                          <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Year</Label>
                      <Input 
                        type="number" min="2000" max="2100" 
                        value={sessionForm.year} 
                        onChange={e => setSessionForm({...sessionForm, year: parseInt(e.target.value)})} 
                        required 
                        className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Monthly Student Manager (Optional)</Label>
                    <select 
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={sessionForm.monthlyManagerUserId} 
                      onChange={e => setSessionForm({...sessionForm, monthlyManagerUserId: e.target.value})}
                    >
                      <option value="">-- No Student Manager --</option>
                      {students.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.fullName || s.email}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1.5">This student will have access to add expenses for this specific session.</p>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                  <Button type="button" variant="ghost" onClick={() => setIsNewSessionOpen(false)} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                    Create Session
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Mess Sessions</h3>
            <p className="text-xs text-slate-400">All historical and active mess accounting sessions.</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No mess sessions found</h3>
            <p className="text-xs text-slate-500 max-w-sm">Click "Start New Session" to begin accounting for a new month.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1.5fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month / Year</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Cost</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Meal Rate</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Docs / Guests</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</span>
              </div>
              
              {sessions.map((s) => (
                <div key={s.id} className="grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1.5fr_1fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-800">
                      {new Date(s.year, s.month - 1).toLocaleString('default', { month: 'short' })} {s.year}
                    </span>
                  </div>
                  
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${
                      s.status === "CLOSED" 
                        ? "bg-slate-100 text-slate-500 border-slate-200" 
                        : "bg-green-50 text-green-700 border-green-200"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    {s.totalMessCharge1 ? (
                      <span className="text-sm font-semibold text-slate-800">₹{parseFloat(s.totalMessCharge1).toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                  
                  <div className="text-right">
                    {s.universalMealCharge ? (
                      <span className="text-sm font-medium text-slate-700">₹{parseFloat(s.universalMealCharge).toFixed(2)}</span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-slate-600" title="Documents">
                      <FileText className="w-3 h-3 text-slate-400" /> {s._count.documents}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-600" title="Guests">
                      <Users className="w-3 h-3 text-slate-400" /> {s._count.guestMeals}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                      onClick={() => router.push(`/manager/mess/${s.id}`)}
                    >
                      Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

