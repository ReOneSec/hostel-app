import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import { deleteFile } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            studentProfile: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isOwner = document.userId === session.user.id;
    const isStaff =
      session.user.role === "SUPER_ADMIN" || session.user.role === "HOSTEL_MANAGER";

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error("[Document GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isOwner = document.userId === session.user.id;
    const isAdmin = session.user.role === "SUPER_ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Students cannot delete already approved documents
    if (isOwner && !isAdmin && document.status === "APPROVED") {
      return NextResponse.json(
        { error: "Approved documents cannot be deleted. Please contact administration." },
        { status: 400 }
      );
    }

    // Try deleting from storage if possible
    try {
      const urlParts = document.fileUrl.split("/documents/");
      if (urlParts.length > 1) {
        const storagePath = decodeURIComponent(urlParts[1]);
        await deleteFile("documents", storagePath);
      }
    } catch (storageErr) {
      console.warn("[Document DELETE] Could not delete from storage bucket:", storageErr);
    }

    await prisma.document.delete({
      where: { id },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "DOCUMENT_DELETED",
      entity: "Document",
      entityId: id,
      oldValues: {
        documentType: document.documentType,
        fileName: document.fileName,
        status: document.status,
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("[Document DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
