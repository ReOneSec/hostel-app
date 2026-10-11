"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { SelfieCaptureStep } from "@/components/profile-completion/selfie-capture-step";
import { toast } from "sonner";

export default function StudentUploadSelfiePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isCaptured, setIsCaptured] = useState(false);

  async function handleCaptured() {
    setIsCaptured(true);
    toast.success("Selfie verified! Transfer verification completed.");
    // Update local session state if available
    if (update) {
      await update();
    }
    // Give feedback and route to dashboard
    setTimeout(() => {
      router.push("/student/dashboard");
      router.refresh();
    }, 1200);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hostel Transfer Verification
          </h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Your transfer to a new hostel has been recorded. Please capture a quick selfie to verify and complete your transfer.
          </p>
        </div>

        {/* Capture Card */}
        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-6 sm:p-8">
            <SelfieCaptureStep
              triggerType="TRANSFER"
              isCaptured={isCaptured}
              onCaptured={handleCaptured}
            />

            {isCaptured && (
              <div className="mt-6 text-center space-y-3">
                <Button
                  onClick={() => router.push("/student/dashboard")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Proceed to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informational Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secure identity verification • Mirror Hostels</span>
        </div>
      </div>
    </div>
  );
}
