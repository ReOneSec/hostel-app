import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const { id: targetUserId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, username: true }
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Generate a new temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";

    // Update password in Supabase
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const supabaseAdmin = createAdminClient();

    // To update a user, we need their Supabase auth.users UUID.
    // However, we only have the email. We can lookup by email, or we can use admin.listUsers() 
    // Wait, let's find the user in Supabase by email:
    const { data: usersData, error: lookupError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (lookupError) {
      return errorResponse("Failed to connect to authentication system", 500);
    }
    
    const authUser = usersData.users.find(u => u.email === user.email);
    if (!authUser) {
      return errorResponse("User exists in local database but not in authentication system", 404);
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: tempPassword,
    });

    if (updateError) {
      return errorResponse("Failed to update password in authentication system", 500);
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isFirstLogin: true, // Force profile verification
      },
    });

    // Email user their new temporary password
    await sendEmail({
      to: user.email,
      subject: "Mirror Hostels - Password Reset",
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Hi ${user.username},</p>
          <p>An administrator has reset your password. You can log in using the credentials below:</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin: 8px 0 0 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p>For security, please log in and update your password immediately.</p>
          <p>Best regards,<br/>Mirror Hostels Team</p>
        </div>
      `
    });

    await createAuditLog({
      userId: session.user.id,
      action: "USER_PASSWORD_RESET",
      entity: "User",
      entityId: targetUserId,
      newValues: { triggeredByAdmin: true },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse({ message: "Password reset successfully and email sent." });
  } catch (error) {
    console.error("[User Password Reset POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
