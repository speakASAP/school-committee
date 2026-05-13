import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { listUsers } from "@/lib/db/users";
import { toErrorResponse, AppError } from "@/types/errors";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Admin role required", 403);
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const schoolId = searchParams.get("schoolId") ?? undefined;

    if (!tenantId) {
      throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
    }

    const users = await listUsers(tenantId, schoolId);

    return NextResponse.json({ users }, { status: 200 });
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
