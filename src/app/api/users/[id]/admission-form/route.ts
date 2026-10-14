import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-response";
import {
  loadAdmissionFormUser,
  loadAdmissionFormAssetsOnServer,
  buildAdmissionFormPDF,
  admissionFormHeaders,
  admissionFormErrorResponse,
} from "@/lib/admission-form-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id: targetUserId } = await params;

    // STUDENT: only when targetUserId === session.user.id
    if (session.user.role === "STUDENT" && targetUserId !== session.user.id) {
      return errorResponse("Forbidden", 403, "FORBIDDEN");
    }

    let user;
    try {
      user = await loadAdmissionFormUser(targetUserId);
    } catch (queryErr) {
      console.error("[Admission Form Query Error]", queryErr);
      return errorResponse("Internal server error", 500, "INTERNAL");
    }

    if (!user || user.role !== "STUDENT") {
      return errorResponse("Student not found", 404, "NOT_FOUND");
    }

    // HOSTEL_MANAGER: only when an active hostelManagerAssignment overlaps the target student's active hostel assignment
    if (session.user.role === "HOSTEL_MANAGER") {
      const activeStudentHostelId = user.hostelAssignments?.[0]?.hostelId;
      if (!activeStudentHostelId) {
        return errorResponse("Forbidden", 403, "FORBIDDEN");
      }
      const isAssigned = await prisma.hostelManagerAssignment.findFirst({
        where: {
          userId: session.user.id,
          hostelId: activeStudentHostelId,
          isActive: true,
        },
      });
      if (!isAssigned) {
        return errorResponse("Forbidden", 403, "FORBIDDEN");
      }
    }

    // SUPER_ADMIN and MONTHLY_MANAGER: allowed without additional scope check

    const assets = await loadAdmissionFormAssetsOnServer(user);
    const doc = await buildAdmissionFormPDF(user, assets);
    const pdf = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdf, {
      status: 200,
      headers: admissionFormHeaders(user, pdf.length),
    });
  } catch (error) {
    return admissionFormErrorResponse(error);
  }
}
