import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/utils/supabase/admin";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
});

const GENERIC_SUCCESS_MESSAGE =
  "If your email is registered, you will receive password reset instructions.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = forgotPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse("Invalid email format", 400, "VALIDATION_ERROR");
    }

    const { email } = parseResult.data;

    // Check if user exists in database and is ACTIVE
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, status: true },
    });

    if (user && user.status === "ACTIVE") {
      try {
        // Generate temporary credentials or reset link
        const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";

        const supabaseAdmin = createAdminClient();
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        const authUser = usersData?.users.find((u) => u.email === user.email);
        if (authUser) {
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            password: tempPassword,
          });

          await prisma.user.update({
            where: { id: user.id },
            data: { isFirstLogin: true },
          });

          await sendEmail({
            to: user.email,
            subject: "Mirror Hostels - Password Reset",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Hi ${user.username},</p>
                <p>We received a password reset request for your account. You can log in using your temporary credentials below:</p>
                <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Email:</strong> ${user.email}</p>
                  <p style="margin: 8px 0 0 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
                </div>
                <p>Please log in and change your password immediately.</p>
                <p>Best regards,<br/>Mirror Hostels Team</p>
              </div>
            `,
          });
        }
      } catch (err) {
        console.error("[Auth Forgot Password] Internal reset failed:", err);
        // Do not leak error to client to maintain generic anti-enumeration response
      }
    }

    // Always return generic success to prevent user enumeration
    return successResponse({ message: GENERIC_SUCCESS_MESSAGE });
  } catch (error) {
    console.error("[Auth Forgot Password]", error);
    return successResponse({ message: GENERIC_SUCCESS_MESSAGE });
  }
}
