import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, documentStatusEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "HOSTEL_MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;
    const body = await req.json();
    const { status, reason } = body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status provided. Must be APPROVED or REJECTED." },
        { status: 400 }
      );
    }

    if (status === "REJECTED" && !reason) {
      return NextResponse.json(
        { error: "A rejection reason is required." },
        { status: 400 }
      );
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        verifiedBy: user.id,
        verifiedAt: new Date(),
        rejectionReason: status === "REJECTED" ? reason : null,
      },
      include: {
        user: {
          include: { studentProfile: true }
        }
      }
    });

    // Send email notification
    const studentName = updatedDocument.user.studentProfile?.fullName || updatedDocument.user.username;
    await sendEmail({
      to: updatedDocument.user.email,
      subject: `Document ${status === "APPROVED" ? "Approved" : "Rejected"} - Mirror Hostels`,
      html: documentStatusEmail(studentName, status as "APPROVED" | "REJECTED", updatedDocument.documentType, reason),
      userId: updatedDocument.user.id,
      type: "DOCUMENT_STATUS",
    });

    // Log the audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `DOCUMENT_${status}`,
        entity: "Document",
        entityId: documentId,
        newValues: {
          reason: reason || null,
        },
      },
    });

    return NextResponse.json({ data: updatedDocument });
  } catch (error: any) {
    console.error("Error verifying document:", error);
    return NextResponse.json(
      { error: "Failed to verify document" },
      { status: 500 }
    );
  }
}
