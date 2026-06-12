"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import type { ProfileFormData } from "@/app/(dashboard)/student/complete-profile/page";

const addressSchema = z.object({
  permanentAddress: z.string().min(10, "Please enter your full address"),
  emergencyContact: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit emergency contact number"),
});

type AddressData = z.infer<typeof addressSchema>;

interface AddressStepProps {
  data: ProfileFormData;
  onChange: (data: Partial<ProfileFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function AddressStep({
  data,
  onChange,
  onNext,
  onPrev,
}: AddressStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      permanentAddress: data.permanentAddress,
      emergencyContact: data.emergencyContact,
    },
  });

  function onSubmit(values: AddressData) {
    onChange(values);
    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Address & Emergency Contact</h2>
          <p className="text-sm text-muted-foreground">
            Your permanent address and emergency details
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="permanentAddress">Permanent Address *</Label>
          <Textarea
            id="permanentAddress"
            placeholder="Enter your complete permanent address including city, state and PIN code"
            rows={4}
            className="resize-none"
            {...register("permanentAddress")}
          />
          {errors.permanentAddress && (
            <p className="text-xs text-destructive">
              {errors.permanentAddress.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergencyContact">Emergency Contact Number *</Label>
          <Input
            id="emergencyContact"
            type="tel"
            placeholder="10-digit emergency contact number"
            maxLength={10}
            {...register("emergencyContact")}
          />
          <p className="text-xs text-muted-foreground">
            This number will be contacted in case of an emergency
          </p>
          {errors.emergencyContact && (
            <p className="text-xs text-destructive">
              {errors.emergencyContact.message}
            </p>
          )}
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
