import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

// Server-side Supabase client with service role key (full access)
const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const BUCKETS = {
  documents: "documents",
  selfies: "selfies",
  payments: "payment-proofs",
  mess: "mess-documents",
} as const;

type BucketName = keyof typeof BUCKETS;

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: Buffer | Blob,
  contentType: string
): Promise<{ url: string; path: string }> {
  const bucketName = BUCKETS[bucket];

  if (!supabase) {
    throw new Error("Supabase is not configured. Missing environment variables.");
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return {
    url: publicUrlData.publicUrl,
    path: data.path,
  };
}

/**
 * Get a signed URL for private file access (15 min expiry)
 */
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn = 900 // 15 minutes
): Promise<string> {
  const bucketName = BUCKETS[bucket];

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: BucketName,
  path: string
): Promise<void> {
  const bucketName = BUCKETS[bucket];

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.storage.from(bucketName).remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Validate MIME type server-side
 */
export function validateMimeType(
  contentType: string,
  allowed: string[]
): boolean {
  return allowed.includes(contentType.toLowerCase());
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const ALLOWED_DOCUMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
