"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, BookOpen, UtensilsCrossed, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function StudentMessDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading mess history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mess History</h1>
        <p className="text-sm text-slate-500 mt-0.5">View monthly mess sessions and your individual settlements.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Mess Sessions</h3>
            <p className="text-xs text-slate-400">Select a session to see your specific meal counts and bills.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <UtensilsCrossed className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No mess sessions found</h3>
              <p className="text-xs text-slate-500 max-w-xs">There are no mess sessions recorded for your hostel yet.</p>
            </div>
          ) : (
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month / Year</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Meal Rate</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</span>
              </div>
              
              {sessions.map((s) => (
                <div key={s.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
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
                    {s.universalMealCharge ? (
                      <span className="text-sm font-medium text-slate-700">₹{parseFloat(s.universalMealCharge).toFixed(2)}</span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                      onClick={() => router.push(`/student/mess/${s.id}`)}
                    >
                      Details <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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

