import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    // Verify profile, document, and selfie all exist
    const [profile, documents, selfie] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.document.findMany({
        where: { userId: session.user.id },
      }),
      prisma.selfie.findFirst({
        where: { userId: session.user.id, isCurrent: true },
      }),
    ]);

    if (!profile?.fullName) {
      return errorResponse("Please complete your personal information first", 400);
    }
    if (documents.length === 0) {
      return errorResponse("Please upload at least one document", 400);
    }
    if (!selfie) {
      return errorResponse("Please capture your selfie", 400);
    }

    // Mark profile as complete
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          isProfileComplete: true,
          isFirstLogin: false,
        },
      }),
      prisma.studentProfile.update({
        where: { userId: session.user.id },
        data: { completedAt: new Date() },
      }),
    ]);

    // Update Supabase Auth metadata
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
          isProfileComplete: true,
          isFirstLogin: false
        }
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "PROFILE_COMPLETED",
      entity: "User",
      entityId: session.user.id,
      oldValues: { isProfileComplete: false },
      newValues: { isProfileComplete: true },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return messageResponse("Profile marked as complete");
  } catch (error) {
    console.error("[Profile Mark Complete]", error);
    return errorResponse("Internal server error", 500);
  }
}
