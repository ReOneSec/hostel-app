"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Check, X, Loader2, Eye, Receipt, Calendar, CreditCard, User, Landmark
} from "lucide-react";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PaymentVerificationPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");
  
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [verifyStatus, setVerifyStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  async function fetchPayments() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/payments?status=${statusFilter === "ALL" ? "" : statusFilter}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPayments(json.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch payments");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenVerify(payment: any, status: "APPROVED" | "REJECTED") {
    setSelectedPayment(payment);
    setVerifyStatus(status);
    setRejectionReason("");
    setIsVerifyDialogOpen(true);
  }

  async function submitVerification() {
    if (!selectedPayment) return;
    if (verifyStatus === "REJECTED" && !rejectionReason.trim()) {
      return toast.error("Rejection reason is required");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: verifyStatus,
          rejectionReason: rejectionReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      toast.success(`Payment ${verifyStatus.toLowerCase()} successfully`);
      setIsVerifyDialogOpen(false);
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message || "Failed to verify payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Verification</h1>
          <p className="text-muted-foreground mt-1">Review student payments and match UTR numbers.</p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ALL">All Payments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Submitted Payments</CardTitle>
          <CardDescription>
            {payments.length} payment{payments.length !== 1 && 's'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Bill Details</TableHead>
                    <TableHead>Payment Info</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No payments found in this view.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{payment.user.studentProfile?.fullName || payment.user.username}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {payment.bill.hostel?.name}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(0, payment.bill.month - 1).toLocaleString('default', { month: 'short' })} {payment.bill.year}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {payment.utrNumber && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Landmark className="w-3 h-3 text-muted-foreground" />
                                <span>UTR: <span className="font-medium font-mono">{payment.utrNumber}</span></span>
                              </div>
                            )}
                            {payment.transactionId && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Receipt className="w-3 h-3" />
                                <span>Txn: {payment.transactionId}</span>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Paid: {format(new Date(payment.paymentDate), "MMM d, yyyy")}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                              For: {payment.categories?.map((cat: string) => (
                                <Badge key={cat} variant="secondary" className="text-[10px] uppercase">
                                  {cat.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.status === "PENDING_REVIEW" && <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>}
                          {payment.status === "APPROVED" && <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">Approved</Badge>}
                          {payment.status === "REJECTED" && <Badge variant="destructive">Rejected</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {payment.proofFileUrl && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.open(payment.proofFileUrl!, "_blank", "noopener,noreferrer")}
                              >
                                <Eye className="w-4 h-4 mr-2" /> Proof
                              </Button>
                            )}
                            
                            {payment.status === "PENDING_REVIEW" && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                  onClick={() => handleOpenVerify(payment, "APPROVED")}
                                >
                                  <Check className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleOpenVerify(payment, "REJECTED")}
                                >
                                  <X className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyStatus === "APPROVED" ? "Approve Payment" : "Reject Payment"}
            </DialogTitle>
            <DialogDescription>
              {verifyStatus === "APPROVED" 
                ? "This will update the bill's paid balance and automatically mark it as PAID if fully settled."
                : "Please provide a reason so the student knows why their payment was rejected."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 border rounded bg-muted/30">
              <p className="font-medium text-sm">{selectedPayment?.user?.studentProfile?.fullName}</p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-muted-foreground">Amount: <span className="font-semibold text-emerald-600">₹{selectedPayment ? Number(selectedPayment.amount).toLocaleString('en-IN') : 0}</span></p>
                {selectedPayment?.utrNumber && <p className="text-xs text-muted-foreground font-mono">UTR: {selectedPayment.utrNumber}</p>}
              </div>
            </div>

            {verifyStatus === "REJECTED" && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason <span className="text-destructive">*</span></Label>
                <Textarea 
                  id="reason" 
                  placeholder="e.g., UTR number does not match bank records, amount is incorrect..." 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsVerifyDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={verifyStatus === "APPROVED" ? "default" : "destructive"}
              onClick={submitVerification}
              disabled={isSubmitting || (verifyStatus === "REJECTED" && !rejectionReason.trim())}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
