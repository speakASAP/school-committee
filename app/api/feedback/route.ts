import { NextRequest, NextResponse } from "next/server";
import { tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { createFeedback, listFeedback } from "@/lib/db/feedback";
import { writeAuditEvent } from "@/lib/db/audit";
import { transcribeVoice } from "@/lib/ai/transcribe";
import { callCategorizeAI } from "@/lib/ai/categorize";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";

const ALLOWED_TYPES = ["suggestion", "complaint", "praise", "question", "issue", "other"];
const ROUTE = "/api/feedback";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const body = await req.json() as {
      schoolId?: string;
      classId?: string;
      isAnonymous?: boolean;
      type?: string;
      text?: string;
      voiceFileKey?: string;
      voiceLanguage?: string;
    };

    if (!body.schoolId) {
      body.schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    }
    if (!body.schoolId) {
      throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    }
    if (!body.type || !ALLOWED_TYPES.includes(body.type)) {
      throw new AppError("VALIDATION_ERROR", `type must be one of: ${ALLOWED_TYPES.join(", ")}`, 400);
    }
    if (!body.text?.trim() && !body.voiceFileKey) {
      throw new AppError("VALIDATION_ERROR", "text or voiceFileKey is required", 400);
    }

    const isAnonymous = body.isAnonymous ?? false;

    // Try to get current user — public endpoint, so user may be null
    const user = await tryGetCurrentUser(requestId);

    // Named submission requires authentication and approval
    if (!isAnonymous && !user) {
      throw new AppError("UNAUTHENTICATED", "Authentication required for named feedback", 401);
    }
    if (!isAnonymous && user) {
      requireApproved(user);
    }

    let voiceTranscript: string | undefined;
    if (body.voiceFileKey) {
      try {
        voiceTranscript = await transcribeVoice(body.voiceFileKey, body.voiceLanguage);
      } catch (transcribeErr) {
        logger.error("feedback POST: voice transcription failed", {
          request_id: requestId,
          route: ROUTE,
          error_code: "TRANSCRIPTION_ERROR",
          error_message: transcribeErr instanceof Error ? transcribeErr.message : String(transcribeErr),
          file_key: body.voiceFileKey,
        });
        throw new AppError("INTERNAL_ERROR", "Voice transcription failed", 500);
      }
    }

    const textForCategorization = voiceTranscript ?? body.text?.trim() ?? "";
    const categories = await callCategorizeAI(textForCategorization, body.type, requestId);

    const item = await createFeedback({
      schoolId: body.schoolId,
      classId: body.classId,
      userId: isAnonymous ? undefined : user?.id,
      isAnonymous,
      categories,
      type: body.type,
      text: body.text?.trim() ?? "",
      voiceFileKey: body.voiceFileKey,
      voiceTranscript,
    });

    await writeAuditEvent({
      tenantId: process.env.DEFAULT_TENANT_ID ?? body.schoolId,
      schoolId: body.schoolId,
      // Omit actorUserId for anonymous submissions
      actorUserId: isAnonymous ? undefined : user?.id,
      action: "feedback.submitted",
      entityType: "feedback_item",
      entityId: item.id,
      requestId,
    });

    return NextResponse.json({ id: item.id, status: item.status, voiceTranscript: voiceTranscript ?? null }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("feedback POST: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("feedback POST: unexpected error", {
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

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await tryGetCurrentUser(requestId);
    if (!user) {
      throw new AppError("UNAUTHENTICATED", "Authentication required", 401);
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) {
      throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    }

    const result = await listFeedback(schoolId, {
      status: searchParams.get("status") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    // Scrub userId from anonymous items in response
    const safeItems = result.items.map((item) => ({
      ...item,
      userId: item.isAnonymous ? null : item.userId,
    }));

    return NextResponse.json({ ...result, items: safeItems }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("feedback GET: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("feedback GET: unexpected error", {
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
