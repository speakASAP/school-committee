import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getStorageClient, STORAGE_BUCKET, toPublicUrl } from "@/lib/storage/client";
import { toErrorResponse, AppError } from "@/types/errors";
import { randomUUID } from "crypto";

const ALLOWED_TYPES: Record<string, { ext: string; prefix: string; maxMb: number }> = {
  "image/jpeg":  { ext: "jpg",  prefix: "tasks/photos", maxMb: 20 },
  "image/png":   { ext: "png",  prefix: "tasks/photos", maxMb: 20 },
  "image/webp":  { ext: "webp", prefix: "tasks/photos", maxMb: 20 },
  "video/mp4":   { ext: "mp4",  prefix: "tasks/videos", maxMb: 100 },
  "video/webm":  { ext: "webm", prefix: "tasks/videos", maxMb: 100 },
  "video/quicktime": { ext: "mov", prefix: "tasks/videos", maxMb: 100 },
};

const ALLOWED_ROLES = new Set(["committee", "teacher", "school_staff", "admin"]);
const ROUTE = "/api/storage/upload-url/media";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles.some((r) => ALLOWED_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Insufficient role", 403);
    }

    let body: { contentType?: string; sizeBytes?: number };
    try {
      body = await req.json() as typeof body;
    } catch {
      throw new AppError("VALIDATION_ERROR", "Invalid JSON body", 400);
    }

    const typeConfig = body.contentType ? ALLOWED_TYPES[body.contentType] : undefined;
    if (!typeConfig) {
      throw new AppError("VALIDATION_ERROR", `contentType must be one of: ${Object.keys(ALLOWED_TYPES).join(", ")}`, 400);
    }

    const maxBytes = typeConfig.maxMb * 1024 * 1024;
    if (typeof body.sizeBytes === "number" && body.sizeBytes > maxBytes) {
      throw new AppError("VALIDATION_ERROR", `File too large (max ${typeConfig.maxMb} MB)`, 400);
    }

    const fileKey = `${typeConfig.prefix}/${randomUUID()}.${typeConfig.ext}`;
    const client = getStorageClient();
    const command = new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: fileKey,
      ContentType: body.contentType,
    });
    const uploadUrl = toPublicUrl(await getSignedUrl(client, command, { expiresIn: 300 }));

    logger.info(`${ROUTE}: signed URL generated`, { request_id: requestId, file_key: fileKey });
    return NextResponse.json({ uploadUrl, fileKey }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE}: error`, { request_id: requestId, error_code: err.code, error_message: err.message });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE}: unexpected error`, { request_id: requestId, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
