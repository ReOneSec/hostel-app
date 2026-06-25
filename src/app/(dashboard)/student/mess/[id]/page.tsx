"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Receipt, Plus, Users, Calendar, ArrowDownToLine, ArrowUpFromLine, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

export default function StudentMessSessionDetails() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const sessionId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    type: "MARKET",
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    description: "",
  });
  
  useEffect(() => {
    if (session?.user?.id) {
      fetchDetails();
    }
  }, [sessionId, session]);

  async function fetchDetails() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/mess/sessions/${sessionId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      const sessionData = json.data;
      const myId = session?.user?.id;

      // Filter to only show the logged-in student's personal data
      const myMarketExpenses = sessionData.marketExpenses.filter((e: any) => e.userId === myId);
      const myWaterExpenses = sessionData.waterExpenses.filter((e: any) => e.userId === myId);
      const myContributions = sessionData.initialContributions.filter((e: any) => e.userId === myId);
      const myMealCount = sessionData.mealCounts.find((e: any) => e.userId === myId);
      const mySettlement = sessionData.settlements.find((e: any) => e.userId === myId);

      setData({
        session: sessionData.session,
        marketExpenses: myMarketExpenses,
        waterExpenses: myWaterExpenses,
        contributions: myContributions,
        mealCount: myMealCount,
        settlement: mySettlement
      });

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
        body: JSON.stringify({
          ...expenseForm,
          userId: session?.user?.id
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success("Expense added successfully");
      setIsExpenseOpen(false);
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
      </div>

      <Tabs defaultValue="my-details" className="w-full">
        <TabsList className="bg-slate-100/50 p-1 rounded-xl flex flex-wrap h-auto border border-slate-200 mb-6 max-w-fit">
          <TabsTrigger value="my-details" className="rounded-lg text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">My Details</TabsTrigger>
          <TabsTrigger value="live-transparency" className="rounded-lg text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Live Transparency Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="my-details" className="mt-0 space-y-6">
          {/* Settlement Summary Card */}
          {isClosed && data.settlement && (
            <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-indigo-100/50 bg-indigo-50/80 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-semibold text-indigo-900">Final Settlement Statement</h3>
                  <p className="text-xs text-indigo-700/70 mt-0.5">Your personal breakdown for this session</p>
                </div>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="bg-white rounded-lg border border-indigo-100/50 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Total Meals</p>
                    <p className="text-2xl font-bold text-slate-800">{data.settlement.mealCount}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-indigo-100/50 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Meal Cost</p>
                    <p className="text-2xl font-bold text-slate-800">₹{parseFloat(data.settlement.mealCost).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-indigo-100/50 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Fixed Overhead</p>
                    <p className="text-2xl font-bold text-slate-800">₹{parseFloat(data.settlement.universalCommonCharge).toFixed(2)}</p>
                  </div>
                  <div className={`${parseFloat(data.settlement.netSettlement) > 0 ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"} rounded-lg p-4 shadow-sm`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${parseFloat(data.settlement.netSettlement) > 0 ? "text-red-500" : "text-emerald-600"}`}>Net Settlement</p>
                    <p className="text-xl font-bold">
                      {parseFloat(data.settlement.netSettlement) > 0 
                        ? `You Owe ₹${parseFloat(data.settlement.netSettlement).toFixed(2)}` 
                        : `Refund ₹${Math.abs(parseFloat(data.settlement.netSettlement)).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">My Advances Paid</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Money you paid to the manager at the start</p>
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1">
                {data.contributions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <p className="text-sm font-medium text-slate-500">No advances paid.</p>
                  </div>
                ) : (
                  <div className="min-w-full">
                    <div className="grid grid-cols-[1fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</span>
                    </div>
                    {data.contributions.map((c: any) => (
                      <div key={c.id} className="grid grid-cols-[1fr_1fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                        <span className="text-sm font-medium text-slate-800">{new Date(c.contributionDate).toLocaleDateString()}</span>
                        <span className="text-sm font-bold text-emerald-600 text-right">₹{parseFloat(c.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <ArrowUpFromLine className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">My Out-of-Pocket Expenses</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Bills you paid for and will be reimbursed</p>
                  </div>
                </div>
                {!isClosed && (
                  <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                    <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs rounded-lg cursor-pointer shadow-sm" />}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Expense
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
                      <div className="px-6 py-5 border-b border-slate-100">
                        <DialogTitle className="text-base font-bold text-slate-900">Add Personal Expense</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-0.5">Submit a grocery or water bill for reimbursement.</DialogDescription>
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
                              <Input value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Vegetables, Rice, etc." required className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                          )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                          <Button type="button" variant="ghost" onClick={() => setIsExpenseOpen(false)} className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                            Cancel
                          </Button>
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto">
                            Submit Expense
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="overflow-x-auto flex-1">
                {data.marketExpenses.length === 0 && data.waterExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <p className="text-sm font-medium text-slate-500">No personal expenses recorded.</p>
                  </div>
                ) : (
                  <div className="min-w-[400px]">
                    <div className="grid grid-cols-[1fr_1fr_1fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</span>
                    </div>
                    {[...data.marketExpenses.map((e: any) => ({...e, type: "MARKET"})), ...data.waterExpenses.map((e: any) => ({...e, type: "WATER"}))]
                      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
                      .map((expense: any) => (
                      <div key={expense.id} className="grid grid-cols-[1fr_1fr_1fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                        <span className="text-sm font-medium text-slate-800">{new Date(expense.expenseDate).toLocaleDateString()}</span>
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border uppercase tracking-wider ${
                            expense.type === "WATER" 
                              ? "bg-blue-50 text-blue-700 border-blue-200" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {expense.type}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 text-right">₹{parseFloat(expense.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="live-transparency" className="mt-0 space-y-6">
          <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-indigo-100/50 bg-indigo-50/80 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-base font-semibold text-indigo-900">Live Mess Rate Estimate</h3>
                <p className="text-xs text-indigo-700/70 mt-0.5">Metrics based on data entered so far by all students</p>
              </div>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="bg-white rounded-lg border border-indigo-100/50 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Total Student Meals</p>
                  <p className="text-2xl font-bold text-slate-800">{data.session.liveEstimate?.totalStudentMeals || 0}</p>
                </div>
                <div className="bg-indigo-600 rounded-lg border border-indigo-700 p-4 shadow-sm text-white">
                  <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">Est. Meal Cost</p>
                  <p className="text-2xl font-bold">₹{parseFloat(data.session.liveEstimate?.universalMealCharge || "0").toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg border border-indigo-100/50 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Fixed Overhead</p>
                  <p className="text-2xl font-bold text-slate-800">₹{parseFloat(data.session.liveEstimate?.perStudentCommonCharge || "0").toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg border border-indigo-100/50 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Total Consumables</p>
                  <p className="text-2xl font-bold text-slate-800">₹{parseFloat(data.session.liveEstimate?.totalMessCharge1 || "0").toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">All Students Transparency</h3>
                <p className="text-xs text-slate-500 mt-0.5">See what every student has contributed and consumed.</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {data.session.liveEstimate?.settlements ? (
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr] px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Meals</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Contributions</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Est. Liability</span>
                  </div>
                  
                  {data.session.liveEstimate.settlements.map((s: any) => (
                    <div key={s.userId} className="grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                      <div className="flex items-center gap-3 pr-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {data.mealCounts?.find((x: any) => x.userId === s.userId)?.user?.fullName || "Student"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 text-center">{s.mealCount}</span>
                      <span className="text-sm font-medium text-emerald-600 text-right">₹{parseFloat(s.totalContribution).toFixed(2)}</span>
                      <span className="text-sm font-medium text-red-600 text-right">₹{parseFloat(s.totalLiability).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-sm text-slate-500">Not enough data to generate estimates yet.</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
