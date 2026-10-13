import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import {
  uploadFile,
  validateMimeType,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const capturedAt = formData.get("capturedAt") as string | null;
    const deviceInfo = formData.get("deviceInfo") as string | null;
    const triggerType = formData.get("triggerType") as string | null;
    const latitude = formData.get("latitude") as string | null;
    const longitude = formData.get("longitude") as string | null;

    if (!file) {
      console.error("[Selfie Upload] Missing file");
      return errorResponse("No file provided", 400);
    }

    const hasRecaptureField = Boolean(
      (prisma as any)._runtimeDataModel?.models?.User?.fields?.some(
        (f: any) => f.name === "canRecaptureSelfie"
      )
    );

    // Verify eligibility for selfie recapture
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        needsSelfieUpdate: true,
        ...(hasRecaptureField
          ? {
              canRecaptureSelfie: true,
              selfieRecaptureReason: true,
            }
          : {}),
        selfies: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    let userCanRecapture = Boolean((user as any).canRecaptureSelfie);
    if (!hasRecaptureField) {
      try {
        const [recaptureData] = await prisma.$queryRaw<Array<{ canRecaptureSelfie: boolean }>>`SELECT "canRecaptureSelfie" FROM users WHERE id = ${session.user.id} LIMIT 1`;
        userCanRecapture = Boolean(recaptureData?.canRecaptureSelfie);
      } catch {
        userCanRecapture = false;
      }
    }

    const hasExistingSelfie = user.selfies.length > 0;
    if (user.role === "STUDENT" && hasExistingSelfie) {
      const isEligible = userCanRecapture || user.needsSelfieUpdate;
      if (!isEligible) {
        return errorResponse(
          "You are not eligible to recapture your selfie. Administrator authorization and a valid documented reason are required.",
          403
        );
      }
    }

    // Validate MIME type
    if (!validateMimeType(file.type, ALLOWED_IMAGE_TYPES)) {
      console.error(`[Selfie Upload] Invalid MIME type: ${file.type}`);
      return errorResponse("Invalid file type", 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error(`[Selfie Upload] File too large: ${file.size}`);
      return errorResponse("File size must be under 5MB", 400);
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${session.user.id}/selfie_${Date.now()}.jpg`;

    let fileUrl: string;
    try {
      const result = await uploadFile("selfies", path, buffer, file.type);
      fileUrl = result.url;
    } catch {
      // Graceful fallback if Supabase not configured
      fileUrl = `/uploads/selfies/${path}`;
      console.warn(
        "[Selfie] Supabase storage not configured, using placeholder URL"
      );
    }

    // Mark all existing selfies as not current
    await prisma.selfie.updateMany({
      where: { userId: session.user.id, isCurrent: true },
      data: { isCurrent: false },
    });

    // Create new selfie record
    const selfie = await prisma.selfie.create({
      data: {
        userId: session.user.id,
        fileUrl,
        capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        deviceInfo: deviceInfo ?? null,
        ipAddress: getIpAddress(req.headers),
        isCurrent: true,
        triggerType: triggerType ?? "PROFILE_COMPLETION",
      },
    });

    // Always clear recapture permissions and transfer flags after upload
    if (hasRecaptureField) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          canRecaptureSelfie: false,
          selfieRecaptureReason: null,
          selfiePermissionGrantedAt: null,
          selfiePermissionGrantedBy: null,
          needsSelfieUpdate: false,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          needsSelfieUpdate: false,
        },
      });
      try {
        await prisma.$executeRaw`UPDATE users SET "canRecaptureSelfie" = false, "selfieRecaptureReason" = NULL, "selfiePermissionGrantedAt" = NULL, "selfiePermissionGrantedBy" = NULL WHERE id = ${session.user.id}`;
      } catch {}
    }

    if (triggerType === "TRANSFER" || user.needsSelfieUpdate) {
      try {
        const { createAdminClient } = await import("@/utils/supabase/admin");
        const supabaseAdmin = createAdminClient();
        
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });
        
        const authUser = usersData.users.find(u => u.email === session.user.email);
        if (authUser) {
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            user_metadata: {
              ...authUser.user_metadata,
              needsSelfieUpdate: false
            }
          });
        }
      } catch (authErr) {
        console.warn("[Selfie Upload] Could not update supabase auth metadata:", authErr);
      }
    }

    await createAuditLog({
      userId: session.user.id,
      action: "SELFIE_UPLOADED",
      entity: "Selfie",
      entityId: selfie.id,
      newValues: {
        triggerType: triggerType ?? "PROFILE_COMPLETION",
        hasGeolocation: !!(latitude && longitude),
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse({ id: selfie.id }, 201);
  } catch (error) {
    console.error("[Selfie Upload]", error);
    return errorResponse("Internal server error", 500);
  }
}
