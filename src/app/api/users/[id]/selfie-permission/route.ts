import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isStaff =
      session.user.role === "SUPER_ADMIN" || session.user.role === "HOSTEL_MANAGER";
    if (!isStaff) {
      return NextResponse.json(
        { error: "Forbidden: Only administrators and hostel managers can grant selfie recapture permissions." },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await params;
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        hostelAssignments: { where: { status: "ACTIVE" } },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If HOSTEL_MANAGER, check hostel assignment overlap
    if (session.user.role === "HOSTEL_MANAGER") {
      const managedHostels = await prisma.hostelManagerAssignment.findMany({
        where: { userId: session.user.id, isActive: true },
      });
      const managedHostelIds = managedHostels.map((h) => h.hostelId);
      const isAssigned = targetUser.hostelAssignments.some((a) =>
        managedHostelIds.includes(a.hostelId)
      );

      if (!isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: Student is not assigned to any of your managed hostels." },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { canRecapture, reason } = body;

    if (canRecapture === true) {
      if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
        return NextResponse.json(
          { error: "A proper and specific reason is required to grant selfie recapture permission." },
          { status: 400 }
        );
      }
    }

    const trimmedReason = canRecapture ? reason.trim() : null;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        canRecaptureSelfie: !!canRecapture,
        selfieRecaptureReason: trimmedReason,
        selfiePermissionGrantedAt: canRecapture ? new Date() : null,
        selfiePermissionGrantedBy: canRecapture ? session.user.id : null,
      },
      select: {
        id: true,
        canRecaptureSelfie: true,
        selfieRecaptureReason: true,
        selfiePermissionGrantedAt: true,
        selfiePermissionGrantedBy: true,
      },
    });

    // Create Audit Log
    await createAuditLog({
      userId: session.user.id,
      action: canRecapture
        ? "SELFIE_RECAPTURE_PERMISSION_GRANTED"
        : "SELFIE_RECAPTURE_PERMISSION_REVOKED",
      entity: "User",
      entityId: targetUserId,
      newValues: {
        canRecaptureSelfie: !!canRecapture,
        reason: trimmedReason,
        grantedBy: session.user.id,
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    // Notify student
    try {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: "SELFIE_PERMISSION",
          title: canRecapture
            ? "Selfie Recapture Authorized"
            : "Selfie Recapture Authorization Revoked",
          message: canRecapture
            ? `An administrator has granted you permission to recapture your security selfie photo. Reason: "${trimmedReason}". Please upload your new photo.`
            : "Your selfie recapture authorization has been revoked by administration.",
        },
      });
    } catch (notifErr) {
      console.warn("[Selfie Permission] Could not create in-app notification:", notifErr);
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: canRecapture
        ? "Selfie recapture permission granted successfully."
        : "Selfie recapture permission revoked.",
    });
  } catch (error) {
    console.error("[Selfie Permission Error]", error);
    return NextResponse.json(
      { error: "Failed to update selfie recapture permission" },
      { status: 500 }
    );
  }
}
