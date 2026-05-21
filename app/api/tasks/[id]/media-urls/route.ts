import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getTaskMedia } from "@/lib/db/task-media";
import { getMediaPresignedUrls } from "@/lib/storage/media-urls";
import { toErrorResponse, AppError } from "@/types/errors";

const ALLOWED_ROLES = new Set(["committee", "teacher", "school_staff", "admin"]);
const ROUTE = "/api/tasks/[id]/media-urls";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId } = await params;
  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles.some((r) => ALLOWED_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Nedostatečná oprávnění", 403);
    }

    const media = await getTaskMedia(taskId);
    const urls = await getMediaPresignedUrls(media, requestId);

    logger.info(`${ROUTE}: returning media urls`, { request_id: requestId, task_id: taskId, photo_count: urls.photos.length, video_count: urls.videos.length });
    return NextResponse.json(urls, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE}: error`, { request_id: requestId, error_code: err.code, error_message: err.message });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE}: unexpected error`, { request_id: requestId, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
