import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAuditLog, getIpAddress, getUserAgent } from "@/lib/audit";
import {
  uploadFile,
  validateMimeType,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    console.log("[UPLOAD API] Request Headers:", Object.fromEntries(req.headers.entries()));
    const session = await auth();
    console.log("[UPLOAD API] Session retrieved:", session);
    
    if (!session?.user?.id) {
      console.log("[UPLOAD API] Returning 401 because session or user id is missing!");
      return errorResponse("Unauthorized", 401);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }
    if (!documentType) {
      return errorResponse("Document type is required", 400);
    }

    // Validate MIME type server-side
    if (!validateMimeType(file.type, ALLOWED_IMAGE_TYPES)) {
      return errorResponse(
        "Invalid file type. Only JPG, PNG, and WebP images are allowed.",
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("File size must be under 5MB", 400);
    }

    // Validate document type enum
    const validTypes = ["AADHAAR", "VOTER_CARD", "PASSPORT", "DRIVING_LICENCE", "PAN_CARD"];
    if (!validTypes.includes(documentType)) {
      return errorResponse("Invalid document type", 400);
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${session.user.id}/${documentType}_${Date.now()}.${ext}`;

    let fileUrl: string;
    try {
      const result = await uploadFile("documents", path, buffer, file.type);
      fileUrl = result.url;
    } catch {
      // If Supabase is not configured, use a placeholder URL
      fileUrl = `/uploads/documents/${path}`;
      console.warn(
        "[Documents] Supabase storage not configured, using placeholder URL"
      );
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        documentType: documentType as "AADHAAR" | "VOTER_CARD" | "PASSPORT" | "DRIVING_LICENCE" | "PAN_CARD",
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        uploadedBy: session.user.id,
        status: "PENDING",
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "DOCUMENT_UPLOADED",
      entity: "Document",
      entityId: document.id,
      newValues: {
        documentType,
        fileName: file.name,
        fileSize: file.size,
      },
      ipAddress: getIpAddress(req.headers),
      userAgent: getUserAgent(req.headers),
    });

    return successResponse(
      { id: document.id, fileName: file.name, documentType },
      201
    );
  } catch (error) {
    console.error("[Document Upload]", error);
    return errorResponse("Internal server error", 500);
  }
}
