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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Receipt, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type PaymentData = {
  id: string;
  amount: string;
  paymentDate: string;
  status: string;
  transactionId: string | null;
  utrNumber: string | null;
  proofFileUrl: string | null;
  user: {
    username: string;
    studentProfile: { fullName: string } | null;
  };
  bill: {
    month: number;
    year: number;
    totalAmount: string;
    hostel: { name: string };
  };
};

export default function ManagerPaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  async function fetchPendingPayments() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/payments?status=PENDING_REVIEW");
      if (!res.ok) throw new Error("Failed to fetch payments");
      const { data } = await res.json();
      setPayments(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load payment queue");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(status: "APPROVED" | "REJECTED") {
    if (!selectedPayment) return;
    
    if (status === "REJECTED" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          rejectionReason: status === "REJECTED" ? rejectionReason : null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to verify payment");
      }

      toast.success(`Payment ${status.toLowerCase()} successfully`);
      setSelectedPayment(null);
      setRejectionReason("");
      fetchPendingPayments();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Verification</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve pending student payments.
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Clock className="w-4 h-4 mr-2" />
          {payments.length} Pending
        </Badge>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Bill Month</TableHead>
              <TableHead>Hostel</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead>Reference (UTR)</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading payment queue...
                  </div>
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground flex-col items-center justify-center py-12">
                  <CheckCircle2 className="w-12 h-12 mb-4 opacity-20 mx-auto text-emerald-500" />
                  <p>All caught up! No pending payments to review.</p>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="font-medium">{payment.user.studentProfile?.fullName || payment.user.username}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {new Date(payment.bill.year, payment.bill.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Bill Total: ₹{parseFloat(payment.bill.totalAmount).toFixed(0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {payment.bill.hostel.name}
                  </TableCell>
                  <TableCell className="font-bold text-emerald-600">
                    ₹{parseFloat(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {payment.utrNumber || payment.transactionId || "N/A"}
                    <div className="text-xs text-muted-foreground mt-1 font-sans">
                      {format(new Date(payment.paymentDate), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      onClick={() => setSelectedPayment(payment)}
                      size="sm"
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Review Payment</DialogTitle>
            <DialogDescription>
              Verify the payment details against the uploaded screenshot.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Left Column: Details */}
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student</span>
                    <span className="font-medium">{selectedPayment.user.studentProfile?.fullName || selectedPayment.user.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bill Month</span>
                    <span className="font-medium">{new Date(selectedPayment.bill.year, selectedPayment.bill.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bill Total</span>
                    <span className="font-medium">₹{parseFloat(selectedPayment.bill.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border my-2 pt-2 flex justify-between">
                    <span className="text-muted-foreground font-medium">Claimed Amount</span>
                    <span className="font-bold text-emerald-600">₹{parseFloat(selectedPayment.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Date</span>
                    <span className="font-medium">{format(new Date(selectedPayment.paymentDate), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UTR / Ref</span>
                    <span className="font-mono bg-background px-1 rounded">{selectedPayment.utrNumber || selectedPayment.transactionId || "N/A"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                  <Input
                    id="rejectionReason"
                    placeholder="e.g. Blurry screenshot, UTR not matching..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => handleVerify("REJECTED")}
                    disabled={isProcessing}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleVerify("APPROVED")}
                    disabled={isProcessing}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>

              {/* Right Column: Screenshot */}
              <div className="border rounded-lg overflow-hidden flex flex-col bg-muted/20">
                <div className="bg-muted p-2 border-b flex justify-between items-center">
                  <span className="text-xs font-medium px-2">Payment Proof</span>
                  {selectedPayment.proofFileUrl && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(selectedPayment.proofFileUrl!, '_blank')}>
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open Full
                    </Button>
                  )}
                </div>
                <div className="flex-1 p-2 flex items-center justify-center bg-black/5 min-h-[300px]">
                  {selectedPayment.proofFileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={selectedPayment.proofFileUrl} 
                      alt="Payment Proof" 
                      className="max-w-full max-h-[400px] object-contain rounded"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Receipt className="w-12 h-12 opacity-20 mb-2" />
                      <span className="text-sm">No proof uploaded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
