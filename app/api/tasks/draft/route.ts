import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { callTaskDraftAI } from "@/lib/ai/task-draft";
import { createTaskDraft } from "@/lib/db/task-media";
import { transcribeAudioFile } from "@/lib/storage/transcribe";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";

const ALLOWED_ROLES = new Set(["committee", "teacher", "school_staff", "admin"]);
const ROUTE = "/api/tasks/draft";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);
    if (!user.roles.some((r) => ALLOWED_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Insufficient role", 403);
    }

    const body = await req.json() as {
      schoolId?: string;
      tenantId?: string;
      classId?: string;
      audioFileId?: string;
      videoFileIds?: string[];
      photoFileIds?: string[];
      textNote?: string;
    };

    const schoolId = body.schoolId ?? process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    if (!body.audioFileId && !body.videoFileIds?.length && !body.textNote) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Provide at least one of: audioFileId, videoFileIds, textNote", requestId } },
        { status: 422 },
      );
    }

    const tenantId = body.tenantId ?? process.env.DEFAULT_TENANT_ID ?? "";

    // Transcribe audio (failure is non-fatal)
    let transcript: string | undefined;
    if (body.audioFileId) {
      try {
        transcript = await transcribeAudioFile(body.audioFileId, requestId);
      } catch (err) {
        logger.error(`${ROUTE}: transcription failed, proceeding without transcript`, {
          request_id: requestId,
          error_message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // AI draft (failure is non-fatal — falls back to raw text)
    let draftResult: Awaited<ReturnType<typeof callTaskDraftAI>> | null = null;
    let aiFailed = false;
    try {
      draftResult = await callTaskDraftAI({ transcript, textNote: body.textNote, language: "cs" }, requestId);
    } catch (err) {
      aiFailed = true;
      logger.error(`${ROUTE}: AI draft failed, falling back to raw text`, {
        request_id: requestId,
        error_message: err instanceof Error ? err.message : String(err),
      });
    }

    const rawFallback = transcript ?? body.textNote ?? "";
    const title = draftResult?.title ?? (rawFallback.slice(0, 80) || "Nový úkol");
    const description = draftResult?.description ?? rawFallback;
    const priority = draftResult?.priority ?? "normal";
    const deadline = draftResult?.deadline;

    // Extract UUID from voice file key (DB column is typed as UUID)
    const extractAudioUuid = (fileKey: string) => fileKey.split("/").pop()?.replace(/\.[^.]+$/, "") ?? fileKey;

    const task = await createTaskDraft({
      schoolId,
      classId: body.classId,
      tenantId,
      createdBy: user.id,
      title,
      description,
      priority,
      deadline,
      audioFileId: body.audioFileId ? extractAudioUuid(body.audioFileId) : undefined,
      rawTranscript: transcript,
      aiDraftMeta: { modelTier: draftResult?.modelTier ?? "none", aiFailed, processedAt: new Date().toISOString() },
      photoFileKeys: body.photoFileIds,
      videoFileKeys: body.videoFileIds,
      requestId,
    });

    logger.info(`${ROUTE}: draft created`, { request_id: requestId, task_id: task.id, ai_failed: aiFailed });
    return NextResponse.json({ data: { ...task, aiFailed } }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE}: error`, {
        request_id: requestId,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE}: unexpected error`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
