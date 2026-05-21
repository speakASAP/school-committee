import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { toggleIdeaVote } from "@/lib/db/ideas";
import { awardBadgesForUser } from "@/lib/gamification/award-badges";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/ideas/[id]/vote";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: ideaId } = await params;
  try {
    const user = await getCurrentUser(requestId);
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    const tenantId = process.env.DEFAULT_TENANT_ID ?? schoolId;

    const result = await toggleIdeaVote(ideaId, user.id, tenantId, schoolId, requestId);

    awardBadgesForUser(user.id).catch(() => {});

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas/[id]/vote POST: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
