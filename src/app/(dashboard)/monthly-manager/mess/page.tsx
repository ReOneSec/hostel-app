"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, BookOpen, Plus, Calendar, FileText, Users, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

export default function MonthlyManagerMessDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [myHostelId, setMyHostelId] = useState<string>("");
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session]);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Find the hostel ID for this student
      const resProfile = await fetch("/api/users/me");
      const profileData = await resProfile.json();
      
      const assignments = profileData.data?.hostelAssignments || [];
      const activeAssignment = assignments.find((a: any) => a.status === "ACTIVE");
      const myHostel = activeAssignment?.hostelId;

      if (!myHostel) {
        toast.error("You are not actively assigned to any hostel");
        return;
      }
      
      setMyHostelId(myHostel);

      // Fetch sessions
      const resSessions = await fetch(`/api/mess/sessions?hostelId=${myHostel}`);
      const sessionsData = await resSessions.json();
      setSessions(sessionsData.data || []);

    } catch (e) {
      toast.error("Failed to load mess data");
    } finally {
      setIsLoading(false);
    }
  }

  async function startSession(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!myHostelId) return;
      
      const res = await fetch("/api/mess/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId: myHostelId,
          month: sessionForm.month,
          year: sessionForm.year
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
        <p className="text-sm text-slate-400 mt-3">Loading mess sessions…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mess Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage expenses and guest meals for your assigned month.</p>
        </div>
        <div>
          <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm rounded-lg cursor-pointer shadow-sm" />}>
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
            <p className="text-xs text-slate-400">Select the current month's session to log expenses.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No mess sessions found</h3>
              <p className="text-xs text-slate-500 max-w-xs">Start a new session to begin logging expenses.</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

