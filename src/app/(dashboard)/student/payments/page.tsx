"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Receipt, CreditCard, Download } from "lucide-react";
import { toast } from "sonner";
import { generateReceiptPDF } from "@/lib/pdf-generator";

type PaymentData = {
  id: string;
  amount: string;
  paymentDate: string;
  status: string;
  transactionId: string | null;
  utrNumber: string | null;
  proofFileUrl: string | null;
  rejectionReason: string | null;
  billId: string;
  bill: {
    month: number;
    year: number;
    totalAmount: string;
  };
  user: any;
};

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/student/payments");
      if (!res.ok) throw new Error("Failed to fetch payments");
      const { data } = await res.json();
      setPayments(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load payment history");
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>;
      case "PENDING_REVIEW":
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Pending Review</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
          <p className="text-muted-foreground mt-1">
            View all your past payments and their verification status.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Bill Month</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead>Reference (UTR)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Proof</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading payments...
                  </div>
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground flex-col items-center justify-center py-12">
                  <Receipt className="w-12 h-12 mb-4 opacity-20 mx-auto" />
                  <p>No payments recorded yet.</p>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    {new Date(payment.bill.year, payment.bill.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(payment.paymentDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-bold">
                    ₹{parseFloat(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {payment.utrNumber || payment.transactionId || "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      {getStatusBadge(payment.status)}
                      {payment.status === "REJECTED" && payment.rejectionReason && (
                        <span className="text-xs text-destructive max-w-[200px] truncate" title={payment.rejectionReason}>
                          Reason: {payment.rejectionReason}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "APPROVED" && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-primary hover:text-primary/80"
                        onClick={() => generateReceiptPDF(payment)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Receipt
                      </Button>
                    )}
                    {payment.proofFileUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(payment.proofFileUrl as string, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Proof
                      </Button>
                    )}
                    {!payment.proofFileUrl && payment.status !== "APPROVED" && (
                      <span className="text-xs text-muted-foreground">No proof</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
