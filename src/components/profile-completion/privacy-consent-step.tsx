"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Lock, Database, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-auth";

interface PrivacyConsentStepProps {
  onConsentGiven: () => void;
}

export function PrivacyConsentStep({ onConsentGiven }: PrivacyConsentStepProps) {
  const { update } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!agreed) {
      toast.error("Please agree to the privacy policy to continue.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/profile/privacy-consent", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to save privacy consent.");
      }

      await update({ privacyConsentAt: new Date().toISOString() });
      toast.success("Consent recorded successfully.");
      onConsentGiven();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full justify-center max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Privacy & Data Security</h2>
        <p className="text-muted-foreground">
          Before you complete your profile, we want to be fully transparent about how we handle your data.
        </p>
      </div>

      <div className="space-y-6 mb-8">
        <div className="flex gap-4">
          <div className="mt-1">
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Data We Collect</h3>
            <p className="text-sm text-muted-foreground mt-1">
              We collect your basic personal details, emergency contact information, and government ID/selfie for strict verification and security purposes inside the hostel premises.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="mt-1">
            <Lock className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">How We Secure It</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your data is encrypted both in transit and at rest using industry-standard AES-256 encryption. We utilize Supabase's secure infrastructure to ensure maximum database protection.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="mt-1">
            <EyeOff className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Strictly Internal Use</h3>
            <p className="text-sm text-muted-foreground mt-1">
              We never sell or share your data with third parties. Your information is used exclusively by hostel management to verify your identity, manage emergencies, and run the daily operations securely.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-accent/30 p-4 rounded-lg mb-8 border flex items-start gap-3">
        <Checkbox 
          id="consent" 
          checked={agreed} 
          onCheckedChange={(checked) => setAgreed(checked as boolean)} 
          className="mt-1"
        />
        <label htmlFor="consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
          I have read and understand the Privacy & Security terms. I consent to the collection and processing of my personal data for hostel verification and management purposes.
        </label>
      </div>

      <Button 
        size="lg" 
        className="w-full sm:w-auto mx-auto px-8" 
        onClick={handleSubmit}
        disabled={!agreed || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Recording Consent...
          </>
        ) : (
          "I Agree & Continue"
        )}
      </Button>
    </div>
  );
}
