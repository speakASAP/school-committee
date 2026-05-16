import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getPresignClient, STORAGE_BUCKET } from "@/lib/storage/client";
import { toErrorResponse, AppError } from "@/types/errors";
import { randomUUID } from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/wav": "wav",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ROUTE = "/api/storage/upload-url";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    await getCurrentUser(requestId);

    const body = (await req.json()) as { contentType?: string; sizeBytes?: number };

    if (!body.contentType || !ALLOWED_TYPES[body.contentType]) {
      throw new AppError("VALIDATION_ERROR", `contentType must be one of: ${Object.keys(ALLOWED_TYPES).join(", ")}`, 400);
    }
    if (typeof body.sizeBytes === "number" && body.sizeBytes > MAX_SIZE_BYTES) {
      throw new AppError("VALIDATION_ERROR", `File too large (max ${MAX_SIZE_BYTES / 1024 / 1024} MB)`, 400);
    }

    const ext = ALLOWED_TYPES[body.contentType];
    const fileKey = `voice/${randomUUID()}.${ext}`;

    const client = getPresignClient();
    const command = new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: fileKey,
      ContentType: body.contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    logger.info("storage/upload-url: signed URL generated", {
      request_id: requestId,
      route: ROUTE,
      file_key: fileKey,
    });

    return NextResponse.json({ uploadUrl, fileKey }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("storage/upload-url: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("storage/upload-url: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
