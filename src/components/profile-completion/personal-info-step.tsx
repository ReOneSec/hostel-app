"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, User } from "lucide-react";
import type { ProfileFormData } from "@/app/(dashboard)/student/complete-profile/page";

const personalInfoSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  fatherName: z.string().min(2, "Father's name is required"),
  motherName: z.string().min(2, "Mother's name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  bloodGroup: z.string().min(1, "Blood group is required"),
  personalEmail: z.string().email("Please enter a valid personal email address"),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  parentMobile: z.string().min(10, "Parent mobile must be at least 10 characters").max(15, "Invalid mobile number"),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;

interface PersonalInfoStepProps {
  data: ProfileFormData;
  onChange: (data: Partial<ProfileFormData>) => void;
  onNext: () => void;
}

export function PersonalInfoStep({
  data,
  onChange,
  onNext,
}: PersonalInfoStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: data.fullName,
      fatherName: data.fatherName,
      motherName: data.motherName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      mobile: data.mobile,
      parentMobile: data.parentMobile,
      personalEmail: data.personalEmail,
    },
  });

  function onSubmit(values: PersonalInfoData) {
    onChange(values);
    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Personal Information</h2>
          <p className="text-sm text-muted-foreground">
            Fill in your basic details
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            placeholder="Enter your full name"
            {...register("fullName")}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fatherName">Father&apos;s Name *</Label>
          <Input
            id="fatherName"
            placeholder="Father's name"
            {...register("fatherName")}
          />
          {errors.fatherName && (
            <p className="text-xs text-destructive">
              {errors.fatherName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="motherName">Mother&apos;s Name *</Label>
          <Input
            id="motherName"
            placeholder="Mother's name"
            {...register("motherName")}
          />
          {errors.motherName && (
            <p className="text-xs text-destructive">
              {errors.motherName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          {errors.dateOfBirth && (
            <p className="text-xs text-destructive">
              {errors.dateOfBirth.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender *</Label>
          <Select
            defaultValue={data.gender}
            onValueChange={(val) => setValue("gender", val ?? "")}
          >
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-xs text-destructive">{errors.gender.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloodGroup">Blood Group *</Label>
          <Select
            defaultValue={data.bloodGroup}
            onValueChange={(val) => setValue("bloodGroup", val ?? "")}
          >
            <SelectTrigger id="bloodGroup">
              <SelectValue placeholder="Select blood group" />
            </SelectTrigger>
            <SelectContent>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <SelectItem key={bg} value={bg}>
                  {bg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bloodGroup && (
            <p className="text-xs text-destructive">
              {errors.bloodGroup.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile Number *</Label>
          <Input
            id="mobile"
            type="tel"
            placeholder="10-digit mobile number"
            maxLength={10}
            {...register("mobile")}
          />
          {errors.mobile && (
            <p className="text-xs text-destructive">{errors.mobile.message}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="personalEmail">Personal Email Address *</Label>
          <Input
            id="personalEmail"
            type="email"
            placeholder="Enter your real email address to receive notifications"
            {...register("personalEmail")}
          />
          <p className="text-xs text-muted-foreground">We need this since your login email is just a proxy (@mirror.std)</p>
          {errors.personalEmail && (
            <p className="text-xs text-destructive">{errors.personalEmail.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="parentMobile">Parent's Mobile *</Label>
          <Input
            id="parentMobile"
            type="tel"
            placeholder="10-digit mobile number"
            maxLength={10}
            {...register("parentMobile")}
          />
          {errors.parentMobile && (
            <p className="text-xs text-destructive">{errors.parentMobile.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="cursor-pointer">
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}
