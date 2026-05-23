import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireRole } from "@/lib/auth/require-role";

const ALLOWED_KEYS = new Set(["auto_approve_users"]);

const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID ?? "";
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    requireRole(user, ["school_staff", "admin"]);

    const schoolId = DEFAULT_SCHOOL_ID;
    const settings = await db.schoolSetting.findMany({ where: { schoolId } });

    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    return NextResponse.json({ settings: map }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    requireRole(user, ["school_staff", "admin"]);

    const body = (await req.json()) as { key: string; value: string };
    if (!ALLOWED_KEYS.has(body.key)) {
      throw new AppError("VALIDATION_ERROR", "Neznámý klíč nastavení", 400);
    }

    const schoolId = DEFAULT_SCHOOL_ID;
    const tenantId = DEFAULT_TENANT_ID;

    await db.schoolSetting.upsert({
      where: { schoolId_key: { schoolId, key: body.key } },
      create: { schoolId, key: body.key, value: body.value },
      update: { value: body.value },
    });

    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId: user.id,
      action: "admin.setting_updated",
      entityType: "school_setting",
      entityId: body.key,
      metadata: { key: body.key, value: body.value },
      requestId,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
