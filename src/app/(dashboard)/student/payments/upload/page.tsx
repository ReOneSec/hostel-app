"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Loader2, IndianRupee, ReceiptText, FileUp, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
const paymentSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  transactionId: z.string().optional(),
  utrNumber: z.string().min(1, "UTR/Reference number is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  categories: z.array(z.enum(["RENT", "ESTABLISHMENT_FEE", "BED_FEE", "MESS_CHARGE", "LATE_FEE", "ALL", "OTHER"])).min(1, "Select at least one option"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function PaymentUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const billId = searchParams.get("billId");

  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: searchParams.get("amount") || "",
      categories: ["ALL"],
    }
  });

  const paymentDate = watch("paymentDate");

  useEffect(() => {
    if (!billId) {
      toast.error("No bill ID provided");
      router.push("/student/bills");
    }
  }, [billId, router]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const selected = e.dataTransfer.files[0];
    if (selected) validateAndSetFile(selected);
  }

  function validateAndSetFile(file: File) {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    setFile(file);
  }

  async function onSubmit(data: PaymentFormData) {
    if (!billId) return;
    if (!file) {
      toast.error("Please upload a payment screenshot/proof");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("billId", billId);
      formData.append("amount", data.amount);
      formData.append("transactionId", data.transactionId || "");
      formData.append("utrNumber", data.utrNumber);
      formData.append("paymentDate", new Date(data.paymentDate).toISOString());
      formData.append("categories", JSON.stringify(data.categories));
      formData.append("file", file);

      const res = await fetch("/api/payments", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to submit payment");
      }

      toast.success("Payment submitted successfully for review!");
      router.push("/student/payments");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (!billId) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Payment Proof</h1>
          <p className="text-muted-foreground mt-1">
            Submit your payment details for verification.
          </p>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Enter the exact amount paid and the UTR/Reference number from your bank app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount Paid (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 4500"
                    className="pl-9"
                    {...register("amount")}
                    disabled={isLoading}
                  />
                </div>
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  {...register("paymentDate")}
                  disabled={isLoading}
                />
                {errors.paymentDate && <p className="text-sm text-destructive">{errors.paymentDate.message}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Payment For</Label>
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20">
                {[
                  { id: "ALL", label: "Total Bill Amount" },
                  { id: "RENT", label: "Rent Only" },
                  { id: "ESTABLISHMENT_FEE", label: "Establishment Fee" },
                  { id: "BED_FEE", label: "Bed Fee" },
                  { id: "MESS_CHARGE", label: "Mess Charge" },
                  { id: "LATE_FEE", label: "Late Fee" },
                  { id: "OTHER", label: "Other Partial Amount" }
                ].map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={item.id}
                      checked={watch("categories")?.includes(item.id as any)}
                      onCheckedChange={(checked) => {
                        const current = watch("categories") || [];
                        if (checked) {
                          setValue("categories", [...current, item.id as any]);
                        } else {
                          setValue("categories", current.filter(c => c !== item.id));
                        }
                      }}
                    />
                    <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </div>
              {errors.categories && <p className="text-sm text-destructive">{errors.categories.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="utrNumber">UTR / Reference Number</Label>
              <div className="relative">
                <ReceiptText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="utrNumber"
                  placeholder="e.g. 123456789012"
                  className="pl-9"
                  {...register("utrNumber")}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">The 12-digit UPI reference number or bank transaction number.</p>
              {errors.utrNumber && <p className="text-sm text-destructive">{errors.utrNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Payment Screenshot</Label>
              <div
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center
                  transition-all duration-200 cursor-pointer
                  ${dragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}
                `}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Drop your screenshot here</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Payment...
                </>
              ) : (
                "Submit Payment"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
