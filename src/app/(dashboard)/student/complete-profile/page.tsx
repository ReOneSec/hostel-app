"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PersonalInfoStep } from "@/components/profile-completion/personal-info-step";
import { AddressStep } from "@/components/profile-completion/address-step";
import { DocumentUploadStep } from "@/components/profile-completion/document-upload-step";
import { SelfieCaptureStep } from "@/components/profile-completion/selfie-capture-step";
import { StepIndicator } from "@/components/profile-completion/step-indicator";

export interface ProfileFormData {
  // Step 1: Personal Info
  fullName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  mobile: string;
  parentMobile: string;
  personalEmail: string;
  // Step 2: Address
  permanentAddress: string;
  emergencyContact: string;
  // Step 3: Documents (handled separately via file uploads)
  // Step 4: Selfie (handled separately via camera capture)
}

const STEPS = [
  { id: 1, title: "Personal Info", description: "Basic details" },
  { id: 2, title: "Address", description: "Contact & emergency" },
  { id: 3, title: "Documents", description: "ID verification" },
  { id: 4, title: "Selfie", description: "Photo capture" },
];

export default function CompleteProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentsUploaded, setDocumentsUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: "",
    fatherName: "",
    motherName: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    mobile: "",
    parentMobile: "",
    personalEmail: "",
    permanentAddress: "",
    emergencyContact: "",
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved state on mount or when session loads
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const savedState = localStorage.getItem(`profile-completion-${session.user.id}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.documentsUploaded) setDocumentsUploaded(parsed.documentsUploaded);
        if (parsed.selfieUploaded) setSelfieUploaded(parsed.selfieUploaded);
      } catch (e) {
        console.error("Failed to parse saved profile state", e);
      }
    }
    setIsLoaded(true);
  }, [session?.user?.id]);

  // Save state on change
  useEffect(() => {
    if (!session?.user?.id || !isLoaded) return;
    
    localStorage.setItem(`profile-completion-${session.user.id}`, JSON.stringify({
      currentStep,
      formData,
      documentsUploaded,
      selfieUploaded
    }));
  }, [currentStep, formData, documentsUploaded, selfieUploaded, session?.user?.id, isLoaded]);

  function updateFormData(partial: Partial<ProfileFormData>) {
    setFormData((prev) => ({ ...prev, ...partial }));
  }

  function nextStep() {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  }

  function prevStep() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  async function handleFinalSubmit() {
    if (!documentsUploaded) {
      toast.error("Please upload at least one document");
      setCurrentStep(3);
      return;
    }
    if (!selfieUploaded) {
      toast.error("Please capture your selfie");
      setCurrentStep(4);
      return;
    }

    setIsSubmitting(true);
    try {
      // Save profile data
      const profileRes = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!profileRes.ok) {
        const data = await profileRes.json();
        throw new Error(data.error || "Failed to save profile");
      }

      // Mark profile as complete
      const markRes = await fetch("/api/profile/mark-complete", {
        method: "PATCH",
      });

      if (!markRes.ok) {
        throw new Error("Failed to mark profile as complete");
      }

      // Update the session to reflect profile completion
      await update({ isProfileComplete: true, isFirstLogin: false });

      // Clear saved state from local storage
      if (session?.user?.id) {
        localStorage.removeItem(`profile-completion-${session.user.id}`);
      }

      toast.success("Profile completed successfully! 🎉");
      router.push("/student/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex flex-col">
      {/* Top Bar */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Complete Your Profile</h1>
              <p className="text-xs text-muted-foreground">
                Step {currentStep} of {STEPS.length}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Logged in as {session?.user?.username}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Step Indicator */}
        <StepIndicator steps={STEPS} currentStep={currentStep} />

        {/* Step Content */}
        <Card className="mt-8 border-border/50 shadow-lg">
          <CardContent className="p-6 md:p-8">
            {currentStep === 1 && (
              <PersonalInfoStep
                data={formData}
                onChange={updateFormData}
                onNext={nextStep}
              />
            )}
            {currentStep === 2 && (
              <AddressStep
                data={formData}
                onChange={updateFormData}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            {currentStep === 3 && (
              <DocumentUploadStep
                onUploaded={() => setDocumentsUploaded(true)}
                onNext={nextStep}
                onPrev={prevStep}
                isUploaded={documentsUploaded}
              />
            )}
            {currentStep === 4 && (
              <SelfieCaptureStep
                onCaptured={() => setSelfieUploaded(true)}
                onPrev={prevStep}
                isCaptured={selfieUploaded}
              />
            )}
          </CardContent>
        </Card>

        {/* Final Submit (only visible on step 4 after selfie is taken) */}
        {currentStep === 4 && selfieUploaded && (
          <div className="mt-6 flex justify-center">
            <Button
              size="lg"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="px-8 shadow-lg shadow-primary/20 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing Profile...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Profile
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
