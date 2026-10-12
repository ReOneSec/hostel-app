import { v2 as cloudinary } from "cloudinary";
import { uploadFile as uploadSupabaseFile } from "./storage";

// Configure Cloudinary if credentials are present
const cloudinaryUrl = process.env.CLOUDINARY_URL;
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

const hasCloudinary = Boolean(
  cloudinaryUrl || (cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret)
);

if (hasCloudinary) {
  if (cloudinaryUrl) {
    cloudinary.config({ cloudinary_url: cloudinaryUrl });
  } else {
    cloudinary.config({
      cloud_name: cloudinaryCloudName,
      api_key: cloudinaryApiKey,
      api_secret: cloudinaryApiSecret,
    });
  }
}

export type UploadPurpose = "payment-proof" | "document" | "selfie";

export interface UploadResult {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
}

export async function processUpload({
  file,
  purpose,
  userId,
}: {
  file: File;
  purpose: UploadPurpose;
  userId: string;
}): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "jpg";
  const timestamp = Date.now();
  const fileName = file.name;
  const fileSize = file.size;

  // 1. Try Cloudinary first if configured
  if (hasCloudinary) {
    return new Promise((resolve, reject) => {
      const folder = `mirror_hostels/${purpose}/${userId}`;
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          public_id: `${purpose}_${timestamp}`,
        },
        (error, result) => {
          if (error || !result) {
            console.error("[Upload] Cloudinary upload failed:", error);
            reject(new Error(error?.message || "Cloudinary upload failed"));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            fileName,
            fileSize,
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  // 2. Fall back to Supabase Storage
  const bucketMap: Record<UploadPurpose, "payments" | "documents" | "selfies"> = {
    "payment-proof": "payments",
    document: "documents",
    selfie: "selfies",
  };

  const bucket = bucketMap[purpose];
  const storagePath = `${userId}/${purpose}_${timestamp}.${ext}`;

  try {
    const res = await uploadSupabaseFile(bucket, storagePath, buffer, file.type);
    return {
      url: res.url,
      publicId: res.path,
      fileName,
      fileSize,
    };
  } catch (supabaseError) {
    console.warn("[Upload] Supabase upload failed, using fallback path:", supabaseError);
    return {
      url: `/uploads/${purpose}/${storagePath}`,
      publicId: storagePath,
      fileName,
      fileSize,
    };
  }
}
