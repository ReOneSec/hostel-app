import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { createAdminClient } from "@/utils/supabase/admin";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const { id } = await params;

    const assignments = await prisma.monthlyManagerSession.findMany({
      where: { hostelId: id },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            studentProfile: { select: { fullName: true } }
          }
        }
      }
    });

    return successResponse(assignments);
  } catch (error) {
    console.error("[MonthlyManagers GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

const assignMonthlyManagerSchema = z.object({
  userId: z.string().cuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Unauthorized. Super Admin access required.", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const { userId, month, year } = assignMonthlyManagerSchema.parse(body);

    const hostel = await prisma.hostel.findUnique({ where: { id } });
    if (!hostel) return errorResponse("Hostel not found", 404);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return errorResponse("User not found", 404);

    const result = await prisma.$transaction(async (tx) => {
      // Create new session. This will fail if a manager for this month/year already exists
      // because of the @@unique([hostelId, month, year]) constraint on MonthlyManagerSession.
      // If we want to replace an existing one, we should upsert or delete first.
      
      const existing = await tx.monthlyManagerSession.findUnique({
        where: {
          hostelId_month_year: {
            hostelId: id,
            month,
            year
          }
        }
      });

      let assignment;
      if (existing) {
        // Update existing regardless of whether it's the same user or a different user
        // so that isActive becomes true again if they were previously removed
        assignment = await tx.monthlyManagerSession.update({
          where: { id: existing.id },
          data: {
            userId,
            appointedBy: session.user.id,
            appointedAt: new Date(),
            isActive: true,
          }
        });
      } else {
        assignment = await tx.monthlyManagerSession.create({
          data: {
            userId,
            hostelId: id,
            month,
            year,
            appointedBy: session.user.id,
            isActive: true
          }
        });
      }

      // Update the user's role to MONTHLY_MANAGER
      // Don't downgrade a SUPER_ADMIN or HOSTEL_MANAGER
      if (user.role === "STUDENT") {
        await tx.user.update({
          where: { id: userId },
          data: { role: "MONTHLY_MANAGER" }
        });
      }

      return assignment;
    });

    // Update Supabase Auth user_metadata
    if (user.role === "STUDENT") {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10000 });
        const authUser = users.find((u: any) => u.email === user.email);
        if (authUser) {
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            user_metadata: { ...authUser.user_metadata, role: "MONTHLY_MANAGER" },
            app_metadata: { role: "MONTHLY_MANAGER" }
          });
        }
      } catch (err) {
        console.error("Failed to update Supabase metadata", err);
      }
    }

    await createAuditLog({
      userId: session.user.id,
      action: "MONTHLY_MANAGER_ASSIGNED",
      entity: "Hostel",
      entityId: id,
      newValues: { userId, month, year },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation error", 400);
    console.error("[MonthlyManagers POST]", error);
    // Return friendly error if unique constraint failed or other issue
    return errorResponse("Internal server error", 500);
  }
}
