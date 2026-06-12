import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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
    });

    // We can trigger emails here later if required (Phase 10)

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
