import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
      return errorResponse("Unauthorized", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const { action, rejectionReason } = body; // action: "APPROVE" | "REJECT"

    if (action !== "APPROVE" && action !== "REJECT") {
      return errorResponse("Invalid action", 400);
    }

    const request = await prisma.profileEditRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return errorResponse("Request not found", 404);
    }

    if (request.status !== "PENDING") {
      return errorResponse("Request is already processed", 400);
    }

    let updatedRequest;

    if (action === "APPROVE") {
      // 1. Update the StudentProfile
      const rawChanges = request.requestedChanges as Record<string, any>;
      const allowedFields = [
        "fullName", "fatherName", "motherName", "mobile", 
        "parentMobile", "dateOfBirth", "permanentAddress", 
        "emergencyContact", "bloodGroup", "gender",
        "chronicIllnesses", "allergies", "regularMedications"
      ];
      
      const safeChanges: Record<string, any> = {};
      for (const field of allowedFields) {
        if (field in rawChanges) {
          if (field === "dateOfBirth" && rawChanges[field]) {
            safeChanges[field] = new Date(rawChanges[field]);
          } else {
            safeChanges[field] = rawChanges[field];
          }
        }
      }
      
      const updatedProfile = await prisma.studentProfile.update({
        where: { userId: request.userId },
        data: safeChanges,
      });

      // 2. Mark request as APPROVED
      updatedRequest = await prisma.profileEditRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
        },
      });

      await createAuditLog({
        userId: session.user.id,
        action: "PROFILE_EDIT_APPROVED",
        entity: "StudentProfile",
        entityId: updatedProfile.id,
        newValues: safeChanges,
        ipAddress: getIpAddress(req.headers),
        userAgent: getUserAgent(req.headers),
      });

    } else {
      // Mark as REJECTED
      updatedRequest = await prisma.profileEditRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason || "Rejected by admin",
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
        },
      });
      
      await createAuditLog({
        userId: session.user.id,
        action: "PROFILE_EDIT_REJECTED",
        entity: "ProfileEditRequest",
        entityId: request.id,
        ipAddress: getIpAddress(req.headers),
        userAgent: getUserAgent(req.headers),
      });
    }

    return successResponse(updatedRequest);
  } catch (error) {
    console.error("[Admin Profile Request PATCH]", error);
    return errorResponse("Internal server error", 500);
  }
}
