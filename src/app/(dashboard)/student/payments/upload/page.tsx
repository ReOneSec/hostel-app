"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, Loader2, IndianRupee, ReceiptText, FileUp, CalendarIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { compressImageClientSide } from "@/lib/image-compression";

const paymentSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  transactionId: z.string().optional(),
  utrNumber: z.string().min(1, "UTR/Reference number is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  categories: z.array(z.enum(["RENT", "ESTABLISHMENT_FEE", "BED_FEE", "MESS_CHARGE", "LATE_FEE", "ALL", "OTHER"])).min(1, "Select at least one option"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

function PaymentUploadForm() {
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

  async function validateAndSetFile(file: File) {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    
    setIsLoading(true);
    toast.info("Compressing image...");
    try {
      const compressedFile = await compressImageClientSide(file);
      setFile(compressedFile as File);
    } catch (error) {
      toast.error("Failed to compress image");
    } finally {
      setIsLoading(false);
    }
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
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 rounded-lg shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Upload Payment Proof</h1>
          <p className="text-sm text-slate-500 mt-0.5">Submit your payment details for verification.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <ReceiptText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">Payment Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enter the exact amount paid and the UTR/Reference number.</p>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-semibold text-slate-600 block">Amount Paid (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 4500"
                    className="pl-9 h-10 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                    {...register("amount")}
                    disabled={isLoading}
                  />
                </div>
                {errors.amount && <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.amount.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentDate" className="text-xs font-semibold text-slate-600 block">Payment Date</Label>
                <div className="relative">
                  <Input
                    id="paymentDate"
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    className="h-10 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                    {...register("paymentDate")}
                    disabled={isLoading}
                  />
                </div>
                {errors.paymentDate && <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.paymentDate.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 block mb-2">Payment For</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                {[
                  { id: "ALL", label: "Total Bill Amount" },
                  { id: "RENT", label: "Rent Only" },
                  { id: "ESTABLISHMENT_FEE", label: "Establishment Fee" },
                  { id: "BED_FEE", label: "Bed Fee" },
                  { id: "MESS_CHARGE", label: "Mess Charge" },
                  { id: "LATE_FEE", label: "Late Fee" },
                  { id: "OTHER", label: "Other Partial Amount" }
                ].map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
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
                      className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <Label htmlFor={item.id} className="text-sm font-medium text-slate-700 cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </div>
              {errors.categories && <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.categories.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="utrNumber" className="text-xs font-semibold text-slate-600 block">UTR / Reference Number</Label>
              <div className="relative">
                <ReceiptText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="utrNumber"
                  placeholder="e.g. 123456789012"
                  className="pl-9 h-10 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                  {...register("utrNumber")}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs font-medium text-slate-500 ml-1">The 12-digit UPI reference number or bank transaction number.</p>
              {errors.utrNumber && <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.utrNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 block">Payment Screenshot</Label>
              <div
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center
                  transition-all duration-200 cursor-pointer
                  ${dragActive ? "border-blue-500 bg-blue-50/50 scale-[1.01]" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"}
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
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                      <FileUp className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="mt-2 h-8 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Click or drag screenshot here</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">JPG, PNG, or WebP up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-2">
              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-semibold text-sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Payment...
                  </>
                ) : (
                  "Submit Payment"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PaymentUploadPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading form...</p>
      </div>
    }>
      <PaymentUploadForm />
    </Suspense>
  );
}

