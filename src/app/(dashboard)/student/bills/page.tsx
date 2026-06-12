"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Receipt, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function StudentBillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBills();
  }, []);

  async function fetchBills() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/student/bills");
      if (!res.ok) throw new Error("Failed to fetch bills");
      const { data } = await res.json();
      setBills(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load bills");
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Paid</Badge>;
      case "PARTIALLY_PAID":
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Partial</Badge>;
      case "OVERDUE":
        return <Badge variant="destructive">Overdue</Badge>;
      case "GENERATED":
        return <Badge variant="secondary">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const currentMonthBill = bills.length > 0 ? bills[0] : null;
  const previousBills = bills.length > 1 ? bills.slice(1) : [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bills</h1>
        <p className="text-muted-foreground mt-1">
          View your monthly rent, establishment fees, and mess charges.
        </p>
      </div>

      {!currentMonthBill ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Receipt className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No Bills Generated Yet</p>
            <p className="text-sm">Your bills will appear here on the 1st of every month.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="pb-4 border-b bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-primary" />
                      {new Date(currentMonthBill.year, currentMonthBill.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} Bill
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      Due by <span className="font-semibold text-foreground">{format(new Date(currentMonthBill.dueDate), "MMM d, yyyy")}</span>
                    </CardDescription>
                  </div>
                  {getStatusBadge(currentMonthBill.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Monthly Rent</span>
                    <span className="font-medium">₹{parseFloat(currentMonthBill.rentAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Establishment Fee</span>
                    <span className="font-medium">₹{parseFloat(currentMonthBill.establishmentFee).toFixed(2)}</span>
                  </div>
                  {parseFloat(currentMonthBill.bedFee) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Bed Fee</span>
                      <span className="font-medium">₹{parseFloat(currentMonthBill.bedFee).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(currentMonthBill.messCharge) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Mess Charges (Last Month)</span>
                      <span className="font-medium">₹{parseFloat(currentMonthBill.messCharge).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(currentMonthBill.lateFee) > 0 && (
                    <div className="flex justify-between items-center text-sm text-destructive">
                      <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Late Fee</span>
                      <span className="font-medium">₹{parseFloat(currentMonthBill.lateFee).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-dashed flex justify-between items-center">
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold">₹{parseFloat(currentMonthBill.totalAmount).toFixed(2)}</span>
                </div>
                
                {parseFloat(currentMonthBill.paidAmount) > 0 && (
                  <div className="flex justify-between items-center text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-md">
                    <span>Amount Paid</span>
                    <span className="font-medium">- ₹{parseFloat(currentMonthBill.paidAmount).toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/10 pt-6">
                <div className="w-full flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Remaining Due:</span>
                    <span className="ml-2 font-bold text-lg">
                      ₹{(parseFloat(currentMonthBill.totalAmount) - parseFloat(currentMonthBill.paidAmount)).toFixed(2)}
                    </span>
                  </div>
                  {(currentMonthBill.status === "GENERATED" || currentMonthBill.status === "PARTIALLY_PAID" || currentMonthBill.status === "OVERDUE") && (
                    <Button 
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => router.push(`/student/payments/upload?billId=${currentMonthBill.id}`)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Now
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-4">
            <h3 className="font-semibold text-lg">Previous Bills</h3>
            {previousBills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No previous bills found.</p>
            ) : (
              <div className="space-y-3">
                {previousBills.map((bill: any) => (
                  <Card key={bill.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">
                          {new Date(bill.year, bill.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </span>
                        {getStatusBadge(bill.status)}
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Total: ₹{parseFloat(bill.totalAmount).toFixed(0)}</span>
                        {bill.status !== "PAID" && (
                          <span className="text-destructive font-medium">Due: ₹{(parseFloat(bill.totalAmount) - parseFloat(bill.paidAmount)).toFixed(0)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
