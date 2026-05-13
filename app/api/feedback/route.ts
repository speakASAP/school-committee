import { NextRequest, NextResponse } from "next/server";
import { tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { createFeedback, listFeedback } from "@/lib/db/feedback";
import { writeAuditEvent } from "@/lib/db/audit";
import { transcribeVoice } from "@/lib/ai/transcribe";
import { toErrorResponse, AppError } from "@/types/errors";

const ALLOWED_CATEGORIES = ["general", "safety", "facilities", "teachers", "events", "other"];
const ALLOWED_TYPES = ["suggestion", "complaint", "praise", "question", "issue", "other"];

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const body = await req.json() as {
      schoolId?: string;
      classId?: string;
      isAnonymous?: boolean;
      category?: string;
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
    if (!body.category || !ALLOWED_CATEGORIES.includes(body.category)) {
      throw new AppError("VALIDATION_ERROR", `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`, 400);
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

    // Named submission requires authentication
    if (!isAnonymous && !user) {
      throw new AppError("UNAUTHENTICATED", "Authentication required for named feedback", 401);
    }

    let voiceTranscript: string | undefined;
    if (body.voiceFileKey) {
      voiceTranscript = await transcribeVoice(body.voiceFileKey, body.voiceLanguage);
    }

    const item = await createFeedback({
      schoolId: body.schoolId,
      classId: body.classId,
      userId: isAnonymous ? undefined : user?.id,
      isAnonymous,
      category: body.category,
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
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
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
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
