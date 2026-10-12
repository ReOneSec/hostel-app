import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { processUpload, type UploadPurpose } from "@/lib/upload";
import { validateMimeType, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/lib/storage";

const VALID_PURPOSES: UploadPurpose[] = ["payment-proof", "document", "selfie"];

import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const rateCheck = checkRateLimit(session.user.id, "uploads");
    if (!rateCheck.success) {
      const res = errorResponse(
        "Upload rate limit exceeded. Maximum 20 uploads per hour.",
        429,
        "RATE_LIMITED"
      );
      res.headers.set("Retry-After", String(rateCheck.retryAfter));
      return res;
    }


    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const purpose = formData.get("purpose") as UploadPurpose | null;

    if (!file) {
      return errorResponse("File is required", 400, "VALIDATION_ERROR");
    }

    if (!purpose || !VALID_PURPOSES.includes(purpose)) {
      return errorResponse(
        `Invalid purpose. Must be one of: ${VALID_PURPOSES.join(", ")}`,
        400,
        "VALIDATION_ERROR"
      );
    }

    if (!validateMimeType(file.type, ALLOWED_IMAGE_TYPES)) {
      return errorResponse(
        "Invalid file type. Only JPG, PNG, and WebP images are allowed.",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("File size must be 5MB or less", 400, "VALIDATION_ERROR");
    }

    const result = await processUpload({
      file,
      purpose,
      userId: session.user.id,
    });

    return successResponse(result, 201);
  } catch (error: any) {
    console.error("[API Uploads POST]", error);
    return errorResponse("Failed to process upload", 500, "INTERNAL");
  }
}
