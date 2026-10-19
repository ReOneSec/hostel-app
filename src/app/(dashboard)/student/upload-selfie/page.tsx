"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Camera,
} from "lucide-react";
import { SelfieCaptureStep } from "@/components/profile-completion/selfie-capture-step";
import { toast } from "sonner";
import Link from "next/link";

export default function StudentUploadSelfiePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { userData, isLoading, mutate: mutateProfile } = useUserProfile();
  const [isCaptured, setIsCaptured] = useState(false);

  async function handleCaptured() {
    setIsCaptured(true);
    toast.success("Selfie uploaded and verified successfully!");
    if (update) {
      await update();
    }
    await mutateProfile();
    setTimeout(() => {
      router.push("/student/documents");
      router.refresh();
    }, 1500);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentSelfie = userData?.selfies?.find((s: any) => s.isCurrent) || userData?.selfies?.[0];
  const isTransfer = Boolean(userData?.needsSelfieUpdate);
  const isAuthorizedRecapture = Boolean(userData?.canRecaptureSelfie);
  const isFirstTime = !currentSelfie;

  const isEligible = isFirstTime || isTransfer || isAuthorizedRecapture;

  // If user already has a selfie and neither transfer nor admin authorization exists
  if (!isEligible) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <Card className="border-slate-200 shadow-xl rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Selfie Recapture Locked
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  You are not eligible to recapture your security selfie photo until an administrator or hostel manager grants permission with a documented reason.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Security Verification Rule
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  To protect hostel identity records, selfie recapture is locked by default. If your appearance has changed or an admin requested an updated photo, contact your hostel warden.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Link href="/student/documents" className="flex-1">
                  <Button variant="outline" className="w-full text-xs h-9 border-slate-200 rounded-xl cursor-pointer">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Back to Documents
                  </Button>
                </Link>
                <Link href="/student/dashboard" className="flex-1">
                  <Button className="w-full text-xs h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
            {isTransfer
              ? "Hostel Transfer Verification"
              : isAuthorizedRecapture
              ? "Authorized Selfie Recapture"
              : "Security Photo Verification"}
          </h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {isTransfer
              ? "Your transfer to a new hostel has been recorded. Please capture a quick selfie to verify and complete your transfer."
              : isAuthorizedRecapture
              ? "An administrator has granted permission to update your security photo."
              : "Capture your face photo for security verification and digital ID record."}
          </p>
        </div>

        {/* Admin Authorization Reason Banner */}
        {isAuthorizedRecapture && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-xs text-amber-900 space-y-1.5 shadow-xs">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <Unlock className="w-4 h-4 text-amber-600" />
              Administrator Permission Granted
            </div>
            <p className="text-amber-800 leading-relaxed">
              <strong>Proper Reason:</strong> &ldquo;{userData?.selfieRecaptureReason}&rdquo;
            </p>
          </div>
        )}

        {/* Capture Card */}
        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-6 sm:p-8">
            <SelfieCaptureStep
              triggerType={isTransfer ? "TRANSFER" : isAuthorizedRecapture ? "ADMIN_AUTHORIZED" : "PROFILE_COMPLETION"}
              isCaptured={isCaptured}
              onCaptured={handleCaptured}
            />

            {isCaptured && (
              <div className="mt-6 text-center space-y-3">
                <Button
                  onClick={() => router.push("/student/documents")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Proceed to Documents
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
