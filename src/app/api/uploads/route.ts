import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  uploadFile,
  validateFile,
  generateStoragePath,
  STORAGE_BUCKETS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/uploads";
import { errorResponse } from "@/lib/errors";
import { AppError } from "@/lib/errors";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate request
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized();
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = formData.get("bucket") as string | null;
    const orderId = formData.get("orderId") as string | null;
    const itemId = formData.get("itemId") as string | null;

    if (!file) {
      throw AppError.badRequest("No file provided");
    }

    if (!bucket || !Object.values(STORAGE_BUCKETS).includes(bucket as any)) {
      throw AppError.badRequest(
        `Invalid bucket. Must be one of: ${Object.values(STORAGE_BUCKETS).join(", ")}`,
      );
    }

    // Validate file type and size
    const validation = validateFile(
      { size: file.size, type: file.type },
      {
        maxSizeBytes: MAX_FILE_SIZE_BYTES,
        allowedTypes: [...ALLOWED_IMAGE_TYPES],
      },
    );

    if (!validation.valid) {
      throw AppError.badRequest(validation.error ?? "Invalid file");
    }

    // Determine file extension
    const extensionMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensionMap[file.type] ?? "jpg";

    // Generate storage path
    const filePath = generateStoragePath(bucket as any, {
      orderId: orderId ?? undefined,
      itemId: itemId ?? undefined,
      userId: session.user.id,
      extension,
    });

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const result = await uploadFile({
      bucket: bucket as any,
      filePath,
      file: buffer,
      contentType: file.type,
    });

    return NextResponse.json(
      {
        data: {
          url: result.url,
          path: result.path,
          bucket: result.bucket,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
