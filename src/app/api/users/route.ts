import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    
    if (role) {
      if (role.includes(",")) {
        where.role = { in: role.split(",") };
      } else {
        where.role = role;
      }
    }
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        {
          profile: {
            fullName: { contains: search, mode: "insensitive" }
          }
        }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        isProfileComplete: true,
        createdAt: true,
        studentProfile: {
          select: {
            fullName: true,
            mobile: true,
          }
        },
        hostelAssignments: {
          where: { status: "ACTIVE" },
          include: {
            hostel: { select: { name: true } }
          }
        },
        roomAssignments: {
          where: { status: "ACTIVE" },
          include: { room: true }
        },
        bedAssignments: {
          where: { status: "ACTIVE" },
          include: { bed: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(users);
  } catch (error) {
    console.error("[Users GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  role: z.enum(["SUPER_ADMIN", "HOSTEL_MANAGER", "MONTHLY_MANAGER", "STUDENT"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const body = await req.json();
    const data = createUserSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return errorResponse("User with this email already exists", 400);
    }

    const password = data.password;

    // Create user in Supabase Auth
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const supabaseAdmin = createAdminClient();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: data.role,
        isProfileComplete: false,
        needsSelfieUpdate: false
      }
    });

    if (authError || !authData.user) {
      console.error("[Supabase Auth Error]", authError);
      return errorResponse(authError?.message || "Failed to create user in authentication system", 500);
    }

    // Create user in Prisma profile table
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        role: data.role as Role,
        createdBy: session.user.id,
      },
    });

    try {
      // Send welcome email with credentials
      await sendEmail({
        to: user.email,
        subject: "Welcome to Mirror Hostels - Your Account Details",
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
            <h2>Welcome to Mirror Hostels!</h2>
            <p>Hi ${user.username},</p>
            <p>An account has been created for you. You can log in using the credentials below:</p>
            <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${user.email}</p>
              <p style="margin: 8px 0 0 0;"><strong>Temporary Password:</strong> ${password}</p>
            </div>
            <p>Please log in and complete your profile setup as soon as possible.</p>
            <p>Best regards,<br/>Mirror Hostels Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error("[Email Sending Error]", emailError);
      // We don't fail the user creation if email fails.
    }

    await createAuditLog({
      userId: session.user.id,
      action: "USER_CREATED",
      entity: "User",
      entityId: user.id,
      newValues: {
        email: user.email,
        username: user.username,
        role: user.role,
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }
    console.error("[Users POST]", error);
    return errorResponse("Internal server error", 500);
  }
}
