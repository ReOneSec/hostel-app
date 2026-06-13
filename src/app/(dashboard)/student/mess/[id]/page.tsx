"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Receipt, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  if (isLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return <div>Session not found</div>;

  const isClosed = data.session.status === "CLOSED";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Mess Details: {new Date(data.session.year, data.session.month - 1).toLocaleString('default', { month: 'long' })} {data.session.year}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isClosed ? "secondary" : "default"}>{data.session.status}</Badge>
            {isClosed && (
              <span className="text-sm text-muted-foreground">
                Final Per-Meal Rate: ₹{data.session.universalMealCharge}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Settlement Summary Card */}
        {isClosed && data.settlement && (
          <Card className="md:col-span-2 border-primary">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" /> 
                Final Settlement Statement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Meals</p>
                  <p className="text-2xl font-bold">{data.settlement.mealCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meal Cost</p>
                  <p className="text-2xl font-bold">₹{data.settlement.mealCost}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fixed Overhead</p>
                  <p className="text-2xl font-bold">₹{data.settlement.universalCommonCharge}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Settlement</p>
                  <p className={`text-2xl font-bold ${parseFloat(data.settlement.netSettlement) > 0 ? "text-red-500" : "text-green-500"}`}>
                    {parseFloat(data.settlement.netSettlement) > 0 
                      ? `You Owe ₹${data.settlement.netSettlement}` 
                      : `Refund ₹${Math.abs(parseFloat(data.settlement.netSettlement))}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>My Advances Paid</CardTitle>
            <CardDescription>Money you paid to the manager at the start of the month</CardDescription>
          </CardHeader>
          <CardContent>
            {data.contributions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No advances paid.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.contributions.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{new Date(c.contributionDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">₹{c.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Out-of-Pocket Expenses</CardTitle>
              <CardDescription>Grocery/water bills you paid for and will be reimbursed for</CardDescription>
            </div>
            {!isClosed && (
              <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Expense</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={addExpense} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={expenseForm.type} onChange={e => setExpenseForm({...expenseForm, type: e.target.value})}>
                        <option value="MARKET">Market (Grocery)</option>
                        <option value="WATER">Water Cans</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Amount (₹)</Label>
                      <Input type="number" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value)})} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Date</Label>
                      <Input type="date" required value={expenseForm.expenseDate} onChange={e => setExpenseForm({...expenseForm, expenseDate: e.target.value})} />
                    </div>
                    {expenseForm.type === "MARKET" && (
                      <div className="grid gap-2">
                        <Label>Description</Label>
                        <Input value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Vegetables, Rice, etc." required />
                      </div>
                    )}
                    <Button type="submit" className="w-full">Submit</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {data.marketExpenses.length === 0 && data.waterExpenses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No personal expenses recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...data.marketExpenses.map((e: any) => ({...e, type: "MARKET"})), ...data.waterExpenses.map((e: any) => ({...e, type: "WATER"}))]
                    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
                    .map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={expense.type === "WATER" ? "secondary" : "outline"}>{expense.type}</Badge></TableCell>
                      <TableCell className="text-right">₹{expense.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
