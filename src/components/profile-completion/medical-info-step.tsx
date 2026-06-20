"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, HeartPulse } from "lucide-react";
import type { ProfileFormData } from "@/app/(dashboard)/student/complete-profile/page";

const medicalInfoSchema = z.object({
  chronicIllnesses: z.string().optional(),
  allergies: z.string().optional(),
  regularMedications: z.string().optional(),
});

type MedicalInfoData = z.infer<typeof medicalInfoSchema>;

interface MedicalInfoStepProps {
  data: ProfileFormData;
  onChange: (data: Partial<ProfileFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function MedicalInfoStep({
  data,
  onChange,
  onNext,
  onPrev,
}: MedicalInfoStepProps) {
  const {
    register,
    handleSubmit,
  } = useForm<MedicalInfoData>({
    resolver: zodResolver(medicalInfoSchema),
    defaultValues: {
      chronicIllnesses: data.chronicIllnesses || "",
      allergies: data.allergies || "",
      regularMedications: data.regularMedications || "",
    },
  });

  function onSubmit(values: MedicalInfoData) {
    onChange(values);
    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <HeartPulse className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Medical Information <span className="text-muted-foreground text-sm font-normal">(Optional)</span></h2>
          <p className="text-sm text-muted-foreground">
            For your safety in case of emergencies
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="chronicIllnesses">Chronic Illnesses (if any)</Label>
          <Textarea
            id="chronicIllnesses"
            placeholder="E.g., Asthma, Diabetes..."
            className="resize-none"
            rows={3}
            {...register("chronicIllnesses")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="allergies">Allergies (if any)</Label>
          <Textarea
            id="allergies"
            placeholder="E.g., Peanuts, Penicillin, Dust..."
            className="resize-none"
            rows={3}
            {...register("allergies")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="regularMedications">Regular Medications (if any)</Label>
          <Textarea
            id="regularMedications"
            placeholder="E.g., Inhaler, Insulin..."
            className="resize-none"
            rows={3}
            {...register("regularMedications")}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className="cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button type="submit" className="cursor-pointer">
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}
