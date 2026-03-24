import { getSupabaseServerClient } from "@/lib/db";

// ---- Constants ----
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const STORAGE_BUCKETS = {
  VOUCHERS: "vouchers",
  RECEIPTS: "receipts",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// ---- Types ----
export interface UploadOptions {
  bucket: StorageBucket;
  filePath: string; // path within the bucket, e.g. "orders/{orderId}/{itemId}.jpg"
  file: Buffer | Uint8Array;
  contentType: string;
}

export interface UploadResult {
  url: string;
  path: string;
  bucket: StorageBucket;
}

export interface DeleteOptions {
  bucket: StorageBucket;
  filePath: string;
}

// ---- Validate file before upload ----
export function validateFile(
  file: { size: number; type: string },
  options: { maxSizeBytes?: number; allowedTypes?: string[] } = {},
): { valid: boolean; error?: string } {
  const maxSize = options.maxSizeBytes ?? MAX_FILE_SIZE_BYTES;
  const allowed = options.allowedTypes ?? [...ALLOWED_IMAGE_TYPES];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  if (!allowed.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowed.join(", ")}`,
    };
  }

  return { valid: true };
}

// ---- Generate a unique storage path ----
export function generateStoragePath(
  bucket: StorageBucket,
  options: {
    orderId?: string;
    itemId?: string;
    userId?: string;
    extension?: string;
  },
): string {
  const ext = options.extension ?? "jpg";
  const timestamp = Date.now();

  if (bucket === STORAGE_BUCKETS.VOUCHERS) {
    const folder = options.orderId ? `orders/${options.orderId}` : "misc";
    const filename = options.itemId ? `${options.itemId}_${timestamp}.${ext}` : `${timestamp}.${ext}`;
    return `${folder}/${filename}`;
  }

  if (bucket === STORAGE_BUCKETS.RECEIPTS) {
    const folder = options.orderId ? `orders/${options.orderId}` : "misc";
    return `${folder}/receipt_${timestamp}.${ext}`;
  }

  return `misc/${timestamp}.${ext}`;
}

// ---- Upload a file to Supabase Storage ----
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from(options.bucket)
    .upload(options.filePath, options.file, {
      contentType: options.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(options.bucket)
    .getPublicUrl(data.path);

  return {
    url: publicUrlData.publicUrl,
    path: data.path,
    bucket: options.bucket,
  };
}

// ---- Delete a file from Supabase Storage ----
export async function deleteFile(options: DeleteOptions): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.storage
    .from(options.bucket)
    .remove([options.filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

// ---- Get the public URL for a stored file ----
export function getPublicUrl(bucket: StorageBucket, filePath: string): string {
  const supabase = getSupabaseServerClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
