import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const actor = await getCurrentUser(requestId);
    const body = (await req.json()) as { tenantId?: string; schoolId?: string; reason?: string };
    const tenantId = body.tenantId || process.env.DEFAULT_TENANT_ID || "";
    const schoolId = body.schoolId || process.env.DEFAULT_SCHOOL_ID;
    if (!tenantId) throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId: actor.id,
      action: "account.deletion_requested",
      entityType: "profile",
      entityId: actor.id,
      metadata: { reason: body.reason ?? null, email: actor.email },
      requestId,
    });
    return NextResponse.json(
      { message: "Deletion request received. An admin will process it within 30 days." },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    if (err && typeof err === "object" && "statusCode" in err && typeof (err as { statusCode: unknown }).statusCode === "number") {
      const status = (err as { statusCode: number }).statusCode;
      const code = "code" in err ? String((err as { code: unknown }).code) : "INTERNAL_ERROR";
      const message = err instanceof Error ? err.message : "Unexpected error";
      return NextResponse.json(
        toErrorResponse(new AppError(code as never, message, status), requestId),
        { status },
      );
    }
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
