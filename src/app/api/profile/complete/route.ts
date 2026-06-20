import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().min(2),
  fatherName: z.string().min(2),
  motherName: z.string().min(2),
  dateOfBirth: z.string(),
  gender: z.string(),
  bloodGroup: z.string(),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  parentMobile: z.string().min(10, "Parent mobile must be at least 10 characters"),
  personalEmail: z.string().email(),
  permanentAddress: z.string().min(10),
  emergencyContact: z.string().regex(/^[6-9]\d{9}$/),
  chronicIllnesses: z.string().optional(),
  allergies: z.string().optional(),
  regularMedications: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const data = profileSchema.parse(body);

    // Upsert student profile
    const profile = await prisma.studentProfile.upsert({
      where: { userId: session.user.id },
      update: {
        fullName: data.fullName,
        fatherName: data.fatherName,
        motherName: data.motherName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        mobile: data.mobile,
        parentMobile: data.parentMobile,
        personalEmail: data.personalEmail,
        permanentAddress: data.permanentAddress,
        emergencyContact: data.emergencyContact,
        chronicIllnesses: data.chronicIllnesses,
        allergies: data.allergies,
        regularMedications: data.regularMedications,
      },
      create: {
        userId: session.user.id,
        fullName: data.fullName,
        fatherName: data.fatherName,
        motherName: data.motherName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        mobile: data.mobile,
        parentMobile: data.parentMobile,
        personalEmail: data.personalEmail,
        permanentAddress: data.permanentAddress,
        emergencyContact: data.emergencyContact,
        chronicIllnesses: data.chronicIllnesses,
        allergies: data.allergies,
        regularMedications: data.regularMedications,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "PROFILE_UPDATED",
      entity: "StudentProfile",
      entityId: profile.id,
      newValues: data,
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(profile, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }
    console.error("[Profile Complete]", error);
    return errorResponse("Internal server error", 500);
  }
}
