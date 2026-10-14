import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { errorResponse } from "@/lib/api-response";
import {
  loadAdmissionFormUser,
  loadAdmissionFormAssetsOnServer,
  buildAdmissionFormPDF,
  admissionFormHeaders,
  admissionFormErrorResponse,
} from "@/lib/admission-form-pdf";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (session.user.role !== "STUDENT") {
      return errorResponse("Forbidden", 403, "FORBIDDEN");
    }

    let user;
    try {
      user = await loadAdmissionFormUser(session.user.id);
    } catch (queryErr) {
      console.error("[Admission Form Query Error]", queryErr);
      return errorResponse("Internal server error", 500, "INTERNAL");
    }

    if (!user || user.role !== "STUDENT") {
      return errorResponse("Student not found", 404, "NOT_FOUND");
    }

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
