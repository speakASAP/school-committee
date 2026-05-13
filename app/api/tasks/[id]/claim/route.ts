import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { claimTask } from "@/lib/db/tasks";
import { toErrorResponse, AppError } from "@/types/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);

    const { id: taskId } = await params;
    const body = await req.json().catch(() => ({})) as { tenantId?: string; schoolId?: string };

    const tenantId = body.tenantId || process.env.DEFAULT_TENANT_ID || "";
    const schoolId = body.schoolId || process.env.DEFAULT_SCHOOL_ID || "";

    if (!tenantId || !schoolId) {
      throw new AppError("VALIDATION_ERROR", "tenantId and schoolId are required", 400);
    }

    const task = await claimTask(taskId, user.id, {
      tenantId,
      schoolId,
      requestId,
    });

    return NextResponse.json(
      { task: { id: task.id, status: task.status, isClaimed: true } },
      { status: 200 },
    );
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
