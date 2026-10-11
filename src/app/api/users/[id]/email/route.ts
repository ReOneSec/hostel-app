import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { z } from "zod";

const updateEmailSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((e) => e.toLowerCase().trim()),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !["SUPER_ADMIN", "HOSTEL_MANAGER"].includes(session.user.role)) {
      return errorResponse("Unauthorized. Admin or Manager access required.", 403);
    }

    const { id: targetUserId } = await params;
    const body = await req.json();
    const { email: newEmail } = updateEmailSchema.parse(body);

    const currentUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, username: true, role: true }
    });

    if (!currentUser) {
      return errorResponse("User not found", 404);
    }

    // Role checks: Manager cannot change Super Admin's email, or other Managers
    if (currentUser.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Forbidden. Only Super Admins can modify Super Admin accounts.", 403);
    }
    if (session.user.role === "HOSTEL_MANAGER" && currentUser.role !== "STUDENT") {
      return errorResponse("Managers can only update student emails.", 403);
    }

    // If manager, verify student belongs to one of their hostels
    if (session.user.role === "HOSTEL_MANAGER") {
      const managedHostels = await prisma.hostelManagerAssignment.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { hostelId: true }
      });
      const managedHostelIds = managedHostels.map((h) => h.hostelId);
      const studentAssignments = await prisma.hostelAssignment.findMany({
        where: { userId: targetUserId, status: "ACTIVE" },
        select: { hostelId: true }
      });
      const hasOverlap = studentAssignments.some((a) => managedHostelIds.includes(a.hostelId));
      if (!hasOverlap) {
        return errorResponse("Forbidden: Student is not in your assigned hostels", 403);
      }
    }

    // Check if new email is identical to current email
    if (currentUser.email.toLowerCase() === newEmail) {
      return errorResponse("New email is identical to current email", 400);
    }

    // Check if another Prisma user already has this email
    const existingPrismaUser = await prisma.user.findUnique({
      where: { email: newEmail }
    });
    if (existingPrismaUser) {
      return errorResponse("An account with this email address already exists", 400);
    }

    // Update in Supabase Auth
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const supabaseAdmin = createAdminClient();

    const { data: usersData, error: lookupError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (lookupError) {
      console.error("[Supabase Lookup Error]", lookupError);
      return errorResponse("Failed to connect to authentication system", 500);
    }

    const authUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === currentUser.email.toLowerCase()
    );

    if (authUser) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        {
          email: newEmail,
          email_confirm: true
        }
      );

      if (updateAuthError) {
        console.error("[Supabase Auth Update Error]", updateAuthError);
        return errorResponse(updateAuthError.message || "Failed to update email in authentication system", 400);
      }
    }

    // Update in Prisma
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { email: newEmail }
    });

    // Record Audit Log
    await createAuditLog({
      userId: session.user.id,
      action: "USER_EMAIL_CHANGED",
      entity: "User",
      entityId: targetUserId,
      oldValues: { email: currentUser.email },
      newValues: { email: updatedUser.email },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse({
      id: updatedUser.id,
      email: updatedUser.email,
      message: "Email address updated successfully"
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || "Invalid email address format", 400);
    }
    console.error("[User Email PATCH]", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
}
