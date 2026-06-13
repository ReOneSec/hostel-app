"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
            Mess Session: {new Date(data.session.year, data.session.month - 1).toLocaleString('default', { month: 'long' })} {data.session.year}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isClosed ? "secondary" : "default"}>{data.session.status}</Badge>
            {isClosed && (
              <span className="text-sm text-muted-foreground">
                Universal Meal Charge: ₹{data.session.universalMealCharge}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto">
          {!isClosed && session?.user?.role === "HOSTEL_MANAGER" && (
            <Button onClick={closeSession} variant="destructive">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Close Session & Settle
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="guests">Guest Meals</TabsTrigger>
          <TabsTrigger value="initial">Initial Contributions</TabsTrigger>
          <TabsTrigger value="meals">Student Meal Counts</TabsTrigger>
          {isClosed && <TabsTrigger value="settlements">Final Settlements</TabsTrigger>}
        </TabsList>

        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Market & Water Expenses</CardTitle>
                <CardDescription>Daily grocery and water can logs</CardDescription>
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
                          <Input value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Vegetables, Rice, etc." />
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label>Paid By (Student)</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required
                          value={expenseForm.userId} onChange={e => setExpenseForm({...expenseForm, userId: e.target.value})}>
                          <option value="">-- Select Student --</option>
                          {students.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.fullName || s.email}</option>
                          ))}
                        </select>
                      </div>
                      <Button type="submit" className="w-full">Add Expense</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Paid By</TableHead>
                    <TableHead>Description</TableHead>
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
                      <TableCell>{expense.user.fullName || expense.user.email}</TableCell>
                      <TableCell>{expense.description || "-"}</TableCell>
                      <TableCell className="text-right">₹{expense.amount}</TableCell>
                    </TableRow>
                  ))}
                  {data.marketExpenses.length === 0 && data.waterExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No expenses recorded yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Guest Meals</CardTitle>
                <CardDescription>Record extra meals consumed by guests</CardDescription>
              </div>
              {!isClosed && (
                <Dialog open={isGuestOpen} onOpenChange={setIsGuestOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Guest Meal</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Guest Meal</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addGuest} className="space-y-4 pt-4">
                      <div className="grid gap-2">
                        <Label>Date</Label>
                        <Input type="date" required value={guestForm.mealDate} onChange={e => setGuestForm({...guestForm, mealDate: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Guest Count</Label>
                        <Input type="number" required min="1" value={guestForm.guestCount} onChange={e => setGuestForm({...guestForm, guestCount: parseInt(e.target.value)})} />
                      </div>
                      <Button type="submit" className="w-full">Save</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Guest Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.guestMeals.map((g: any) => (
                    <TableRow key={g.id}>
                      <TableCell>{new Date(g.mealDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{g.guestCount}</TableCell>
                    </TableRow>
                  ))}
                  {data.guestMeals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">No guest meals recorded</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="initial">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Initial Contributions (Advances)</CardTitle>
                <CardDescription>Money collected from students at start of month</CardDescription>
              </div>
              {!isClosed && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Advance</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Initial Contribution</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      setExpenseForm(prev => ({...prev, type: "INITIAL_CONTRIBUTION"}));
                      addExpense(e);
                    }} className="space-y-4 pt-4">
                      <div className="grid gap-2">
                        <Label>Student</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required
                          value={expenseForm.userId} onChange={e => setExpenseForm({...expenseForm, userId: e.target.value})}>
                          <option value="">-- Select Student --</option>
                          {students.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.fullName || s.email}</option>
                          ))}
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
                      <Button type="submit" className="w-full">Save Advance</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.initialContributions.map((ic: any) => (
                    <TableRow key={ic.id}>
                      <TableCell>{new Date(ic.contributionDate).toLocaleDateString()}</TableCell>
                      <TableCell>{ic.user.fullName || ic.user.email}</TableCell>
                      <TableCell className="text-right">₹{ic.amount}</TableCell>
                    </TableRow>
                  ))}
                  {data.initialContributions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No initial contributions recorded</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Student Meal Counts</CardTitle>
                <CardDescription>Enter the total number of meals eaten by each student</CardDescription>
              </div>
              {!isClosed && session?.user?.role === "HOSTEL_MANAGER" && (
                <Button onClick={saveMealCounts} disabled={isSavingMeals}>
                  {isSavingMeals ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Meal Counts"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[150px] text-right">Meal Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.fullName || "Un-named"}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          min="0"
                          disabled={isClosed || session?.user?.role !== "HOSTEL_MANAGER"}
                          className="w-[100px] ml-auto"
                          value={mealCounts[s.id] || 0}
                          onChange={(e) => setMealCounts({...mealCounts, [s.id]: parseInt(e.target.value) || 0})}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isClosed && (
          <TabsContent value="settlements">
            <Card>
              <CardHeader>
                <CardTitle>Final Settlements</CardTitle>
                <CardDescription>Mathematical breakdown of what each student owes or is owed</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Meals</TableHead>
                      <TableHead className="text-right">Meal Cost</TableHead>
                      <TableHead className="text-right">Overhead</TableHead>
                      <TableHead className="text-right">Contributions</TableHead>
                      <TableHead className="text-right">Net Settlement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.settlements.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.user.fullName || s.user.email}</TableCell>
                        <TableCell className="text-right">{s.mealCount}</TableCell>
                        <TableCell className="text-right">₹{s.mealCost}</TableCell>
                        <TableCell className="text-right">₹{s.universalCommonCharge}</TableCell>
                        <TableCell className="text-right text-muted-foreground">₹{s.totalContribution}</TableCell>
                        <TableCell className="text-right font-bold">
                          {parseFloat(s.netSettlement) > 0 
                            ? <span className="text-red-500">Owes ₹{s.netSettlement}</span> 
                            : <span className="text-green-500">Refund ₹{Math.abs(parseFloat(s.netSettlement))}</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
