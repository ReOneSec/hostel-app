"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, Plus, ArrowLeft, Calendar, User, 
  CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, RefreshCcw, HandCoins, Receipt, FileText, Settings, ArrowDownToLine, ArrowUpFromLine, CheckCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export default function MessSessionDetails() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const sessionId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    type: "MARKET",
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    description: "",
    userId: ""
  });

  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [guestForm, setGuestForm] = useState({
    mealDate: new Date().toISOString().split('T')[0],
    guestCount: 1
  });

  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);

  const [mealCounts, setMealCounts] = useState<{ [key: string]: number }>({});
  const [isSavingMeals, setIsSavingMeals] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [sessionId]);

  async function fetchDetails() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/mess/sessions/${sessionId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json.data);

      if (json.data?.session?.hostelId) {
        const resStudents = await fetch(`/api/hostels/${json.data.session.hostelId}/students`);
        const sData = await resStudents.json();
        setStudents(sData.data || []);
        
        // Populate meal counts
        const initialMeals: any = {};
        if (sData.data) {
          sData.data.forEach((s: any) => {
            const existing = json.data.mealCounts.find((mc: any) => mc.userId === s.id);
            initialMeals[s.id] = existing ? existing.mealCount : 0;
          });
        }
        setMealCounts(initialMeals);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load session details");
    } finally {
      setIsLoading(false);
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/mess/sessions/${sessionId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Added successfully");
      setIsExpenseOpen(false);
      setIsAdvanceOpen(false);
      fetchDetails();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/mess/sessions/${sessionId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestForm)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Guest meals added");
      setIsGuestOpen(false);
      fetchDetails();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function saveMealCounts() {
    setIsSavingMeals(true);
    try {
      const countsArray = Object.keys(mealCounts).map(userId => ({
        userId,
        mealCount: mealCounts[userId]
      }));

      const res = await fetch(`/api/mess/sessions/${sessionId}/meal-counts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts: countsArray })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Meal counts saved");
      fetchDetails();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSavingMeals(false);
    }
  }

  async function closeSession() {
    if (!confirm("Are you sure you want to close this session? This will calculate all bills and CANNOT be undone.")) return;
    
    try {
      // Auto save meals first
      await saveMealCounts();

      const res = await fetch(`/api/mess/sessions/${sessionId}/close`, {
        method: "POST"
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Session closed successfully!");
      fetchDetails();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm text-slate-400 mt-3">Loading session details…</p>
    </div>
  );
  if (!data) return <div className="flex justify-center items-center h-[60vh] text-slate-500">Session not found</div>;

  const isClosed = data.session.status === "CLOSED";

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0 rounded-lg shrink-0 text-slate-500 hover:text-slate-900 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {new Date(data.session.year, data.session.month - 1).toLocaleString('default', { month: 'long' })} {data.session.year} Session
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border uppercase tracking-wider ${
                isClosed 
                  ? "bg-slate-100 text-slate-600 border-slate-200" 
                  : "bg-green-50 text-green-700 border-green-200"
              }`}>
                {data.session.status}
              </span>
              {isClosed && (
                <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  Rate: ₹{data.session.universalMealCharge} / meal
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isClosed && ["HOSTEL_MANAGER", "SUPER_ADMIN", "MONTHLY_MANAGER"].includes(session?.user?.role as string) && (
            <Button onClick={closeSession} className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm rounded-lg cursor-pointer">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Close Session & Settle
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="bg-slate-100/50 p-1 rounded-xl flex flex-wrap h-auto border border-slate-200 mb-6 max-w-fit">
          <TabsTrigger value="expenses" className="rounded-lg text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Expenses</TabsTrigger>
          <TabsTrigger value="guests" className="rounded-lg text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Guest Meals</TabsTrigger>
          <TabsTrigger value="initial" className="rounded-lg text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Contributions</TabsTrigger>
          <TabsTrigger value="meals" className="rounded-lg text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Student Meals</TabsTrigger>
          {isClosed ? (
            <TabsTrigger value="settlements" className="rounded-lg text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Final Settlements</TabsTrigger>
          ) : (
            <TabsTrigger value="live-estimates" className="rounded-lg text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Live Estimates</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="expenses" className="mt-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Market & Water Expenses</h3>
                <p className="text-xs text-slate-500 mt-0.5">Daily grocery and water can logs</p>
              </div>
              {!isClosed && (
                <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                  <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm rounded-lg cursor-pointer shadow-sm" />}>
                    <Plus className="w-4 h-4 mr-2" /> Add Expense
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                      <DialogTitle className="text-base font-bold text-slate-900">Add Expense</DialogTitle>
                    </div>
                    <form onSubmit={addExpense}>
                      <div className="px-6 py-5 space-y-4">
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Type</Label>
                          <select 
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                            value={expenseForm.type} 
                            onChange={e => setExpenseForm({...expenseForm, type: e.target.value})}
                          >
                            <option value="MARKET">Market (Grocery)</option>
                            <option value="WATER">Water Cans</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Amount (₹)</Label>
                          <Input type="number" required min="0" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value)})} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Date</Label>
                          <Input type="date" required value={expenseForm.expenseDate} onChange={e => setExpenseForm({...expenseForm, expenseDate: e.target.value})} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        {expenseForm.type === "MARKET" && (
                          <div>
                            <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</Label>
                            <Input value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Vegetables, Rice, etc." className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Paid By (Student)</Label>
                          <select 
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" 
                            required
                            value={expenseForm.userId} 
                            onChange={e => setExpenseForm({...expenseForm, userId: e.target.value})}
                          >
                            <option value="">-- Select Student --</option>
                            {students.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.fullName || s.email}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                        <Button type="button" variant="ghost" onClick={() => setIsExpenseOpen(false)} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                          Add Expense
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[1fr_1fr_1.5fr_2fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid By</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</span>
                </div>
                
                {(() => {
                  const combined = [...data.marketExpenses.map((e: any) => ({...e, type: "MARKET"})), ...data.waterExpenses.map((e: any) => ({...e, type: "WATER"}))]
                    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
                    
                  if (combined.length === 0) {
                    return (
                      <div className="p-12 text-center text-sm text-slate-500">No expenses recorded yet.</div>
                    );
                  }
                  
                  return combined.map((expense: any) => (
                    <div key={expense.id} className="grid grid-cols-[1fr_1fr_1.5fr_2fr_1fr] px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors items-center">
                      <span className="text-sm text-slate-600">{format(new Date(expense.expenseDate), "MMM d, yyyy")}</span>
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border uppercase tracking-wider ${
                          expense.type === "WATER" 
                            ? "bg-blue-50 text-blue-700 border-blue-200" 
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {expense.type}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-800 truncate pr-2">{expense.user.fullName || expense.user.email}</span>
                      <span className="text-sm text-slate-500 truncate pr-2">{expense.description || "—"}</span>
                      <span className="text-sm font-bold text-slate-900 text-right">₹{parseFloat(expense.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="guests" className="mt-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Guest Meals</h3>
                <p className="text-xs text-slate-500 mt-0.5">Record extra meals consumed by guests</p>
              </div>
              {!isClosed && (
                <Dialog open={isGuestOpen} onOpenChange={setIsGuestOpen}>
                  <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm rounded-lg cursor-pointer shadow-sm" />}>
                    <Plus className="w-4 h-4 mr-2" /> Add Guest Meal
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                      <DialogTitle className="text-base font-bold text-slate-900">Add Guest Meal</DialogTitle>
                    </div>
                    <form onSubmit={addGuest}>
                      <div className="px-6 py-5 space-y-4">
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Date</Label>
                          <Input type="date" required value={guestForm.mealDate} onChange={e => setGuestForm({...guestForm, mealDate: e.target.value})} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Guest Count</Label>
                          <Input type="number" required min="1" value={guestForm.guestCount} onChange={e => setGuestForm({...guestForm, guestCount: parseInt(e.target.value)})} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                      </div>
                      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                        <Button type="button" variant="ghost" onClick={() => setIsGuestOpen(false)} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                          Save
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                <div className="grid grid-cols-[1fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Guest Count</span>
                </div>
                
                {data.guestMeals.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">No guest meals recorded.</div>
                ) : (
                  data.guestMeals.map((g: any) => (
                    <div key={g.id} className="grid grid-cols-[1fr_1fr] px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors items-center">
                      <span className="text-sm font-medium text-slate-800">{format(new Date(g.mealDate), "MMM d, yyyy")}</span>
                      <span className="text-sm font-semibold text-slate-900 text-right">{g.guestCount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="initial" className="mt-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Initial Contributions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Money collected from students at start of month (Advances)</p>
              </div>
              {!isClosed && (
                <Dialog open={isAdvanceOpen} onOpenChange={setIsAdvanceOpen}>
                  <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 text-sm rounded-lg cursor-pointer shadow-sm" />}>
                    <Plus className="w-4 h-4 mr-2" /> Add Advance
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                      <DialogTitle className="text-base font-bold text-slate-900">Add Initial Contribution</DialogTitle>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      setExpenseForm(prev => ({...prev, type: "INITIAL_CONTRIBUTION"}));
                      addExpense(e);
                    }}>
                      <div className="px-6 py-5 space-y-4">
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Student</Label>
                          <select 
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" 
                            required
                            value={expenseForm.userId} 
                            onChange={e => setExpenseForm({...expenseForm, userId: e.target.value})}
                          >
                            <option value="">-- Select Student --</option>
                            {students.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.fullName || s.email}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Amount (₹)</Label>
                          <Input type="number" min="0" step="0.01" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value)})} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Date</Label>
                          <Input type="date" required value={expenseForm.expenseDate} onChange={e => setExpenseForm({...expenseForm, expenseDate: e.target.value})} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                      </div>
                      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                        <Button type="button" variant="ghost" onClick={() => setIsAdvanceOpen(false)} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                          Save Advance
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="grid grid-cols-[1fr_2fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</span>
                </div>
                
                {data.initialContributions.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">No initial contributions recorded.</div>
                ) : (
                  data.initialContributions.map((ic: any) => (
                    <div key={ic.id} className="grid grid-cols-[1fr_2fr_1fr] px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors items-center">
                      <span className="text-sm text-slate-600">{format(new Date(ic.contributionDate), "MMM d, yyyy")}</span>
                      <span className="text-sm font-medium text-slate-800 truncate pr-2">{ic.user.fullName || ic.user.email}</span>
                      <span className="text-sm font-bold text-slate-900 text-right">₹{parseFloat(ic.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="meals" className="mt-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Student Meal Counts</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter the total number of meals eaten by each student</p>
              </div>
              {!isClosed && ["HOSTEL_MANAGER", "SUPER_ADMIN", "MONTHLY_MANAGER"].includes(session?.user?.role as string) && (
                <Button 
                  onClick={saveMealCounts} 
                  disabled={isSavingMeals}
                  className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm rounded-lg cursor-pointer shadow-sm"
                >
                  {isSavingMeals ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {isSavingMeals ? "Saving..." : "Save Meal Counts"}
                </Button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-[1.5fr_1.5fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Name</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Meal Count</span>
                </div>
                
                {students.map((s) => (
                  <div key={s.id} className="grid grid-cols-[1.5fr_1.5fr_1fr] px-5 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors items-center">
                    <span className="text-sm font-medium text-slate-800 truncate pr-2">{s.fullName || "Un-named"}</span>
                    <span className="text-sm text-slate-500 truncate pr-2">{s.email}</span>
                    <div className="flex justify-end">
                      <Input 
                        type="number" 
                        min="0"
                        disabled={isClosed || !["HOSTEL_MANAGER", "SUPER_ADMIN", "MONTHLY_MANAGER"].includes(session?.user?.role as string)}
                        className="w-[100px] h-8 border-slate-200 rounded-md text-sm text-right focus:ring-2 focus:ring-blue-500/20"
                        value={mealCounts[s.id] || 0}
                        onChange={(e) => setMealCounts({...mealCounts, [s.id]: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                ))}
                
                {students.length === 0 && (
                  <div className="p-12 text-center text-sm text-slate-500">No students found for this hostel.</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {isClosed && (
          <TabsContent value="settlements" className="mt-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800">Final Settlements</h3>
                <p className="text-xs text-slate-500 mt-0.5">Mathematical breakdown of what each student owes or is owed</p>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1.5fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Meals</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Meal Cost</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Overhead</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Contributions</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Net Settlement</span>
                  </div>
                  
                  {data.settlements.map((s: any) => (
                    <div key={s.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1.5fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors items-center">
                      <span className="text-sm font-medium text-slate-800 truncate pr-2">{s.user.fullName || s.user.email}</span>
                      <span className="text-sm font-semibold text-slate-700 text-right">{s.mealCount}</span>
                      <span className="text-sm text-slate-600 text-right">₹{parseFloat(s.mealCost).toFixed(2)}</span>
                      <span className="text-sm text-slate-600 text-right">₹{parseFloat(s.universalCommonCharge).toFixed(2)}</span>
                      <span className="text-sm text-emerald-600 font-medium text-right">₹{parseFloat(s.totalContribution).toFixed(2)}</span>
                      <div className="flex justify-end">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border uppercase tracking-wider ${
                          parseFloat(s.netSettlement) > 0 
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          {parseFloat(s.netSettlement) > 0 
                            ? `Owes ₹${parseFloat(s.netSettlement).toFixed(2)}` 
                            : `Refund ₹${Math.abs(parseFloat(s.netSettlement)).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {!isClosed && data.session.liveEstimate && (
          <TabsContent value="live-estimates" className="mt-0 space-y-6">
            <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-indigo-100/50 bg-indigo-50/80 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-semibold text-indigo-900">Live Mess Rate Estimate</h3>
                  <p className="text-xs text-indigo-700/70 mt-0.5">Mathematical breakdown of metrics based on data entered so far</p>
                </div>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="bg-white rounded-lg border border-indigo-100/50 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Total Student Meals</p>
                    <p className="text-2xl font-bold text-slate-800">{data.session.liveEstimate.totalStudentMeals}</p>
                  </div>
                  <div className="bg-indigo-600 rounded-lg border border-indigo-700 p-4 shadow-sm text-white">
                    <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">Est. Meal Cost</p>
                    <p className="text-2xl font-bold">₹{parseFloat(data.session.liveEstimate.universalMealCharge).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-indigo-100/50 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Fixed Overhead</p>
                    <p className="text-2xl font-bold text-slate-800">₹{parseFloat(data.session.liveEstimate.perStudentCommonCharge).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-indigo-100/50 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Total Consumables</p>
                    <p className="text-2xl font-bold text-slate-800">₹{parseFloat(data.session.liveEstimate.totalMessCharge1).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Live Settlements Estimate</h3>
                  <p className="text-xs text-slate-500 mt-0.5">What each student owes or is owed right now</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1.5fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Meals</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Contributions</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Est. Liability</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Est. Net Settlement</span>
                  </div>
                  
                  {data.session.liveEstimate.settlements.map((s: any) => (
                    <div key={s.userId} className="grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1.5fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors items-center">
                      <span className="text-sm font-medium text-slate-800 truncate pr-2">
                        {data.mealCounts?.find((x: any) => x.userId === s.userId)?.user?.fullName || "Student"}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 text-center">{s.mealCount}</span>
                      <span className="text-sm text-emerald-600 font-medium text-right">₹{parseFloat(s.totalContribution).toFixed(2)}</span>
                      <span className="text-sm text-slate-600 text-right">₹{parseFloat(s.totalLiability).toFixed(2)}</span>
                      <div className="flex justify-end">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border uppercase tracking-wider ${
                          parseFloat(s.netSettlement) > 0 
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          {parseFloat(s.netSettlement) > 0 
                            ? `Owes ₹${parseFloat(s.netSettlement).toFixed(2)}` 
                            : `Refund ₹${Math.abs(parseFloat(s.netSettlement)).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
