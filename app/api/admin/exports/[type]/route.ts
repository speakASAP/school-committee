import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

const ALLOWED_EXPORT_TYPES = ["payments", "tasks", "feedback"] as const;
type ExportType = typeof ALLOWED_EXPORT_TYPES[number];

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const headerRow = headers.map(escape).join(",");
  const dataRows = rows.map((row) => headers.map((h) => escape(row[h])).join(","));
  return [headerRow, ...dataRows].join("\n");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "CSV exports require admin role", 403);
    }

    const { type } = await params;
    if (!ALLOWED_EXPORT_TYPES.includes(type as ExportType)) {
      throw new AppError("VALIDATION_ERROR", `type must be one of: ${ALLOWED_EXPORT_TYPES.join(", ")}`, 400);
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    const tenantId = searchParams.get("tenantId");
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    if (!tenantId) throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);

    let csv = "";
    let recordCount = 0;

    if (type === "payments") {
      const rows = await db.paymentIntent.findMany({ where: { schoolId } });
      recordCount = rows.length;
      csv = toCsv(["id", "userId", "amountCzk", "variableSymbol", "status", "paidAt"], rows);
    } else if (type === "tasks") {
      const rows = await db.task.findMany({ where: { schoolId } });
      recordCount = rows.length;
      csv = toCsv(["id", "title", "status", "priority", "deadline", "createdAt"], rows);
    } else {
      const rows = await db.feedbackItem.findMany({ where: { schoolId } });
      recordCount = rows.length;
      // Never include userId in exports for anonymous feedback
      const safeRows = rows.map((r) => ({ ...r, userId: r.isAnonymous ? null : r.userId }));
      csv = toCsv(["id", "category", "type", "text", "status", "isAnonymous", "createdAt"], safeRows);
    }

    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId: actor.id,
      action: "export.generated",
      entityType: "export",
      metadata: { exportType: type, recordCount },
      requestId,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-export.csv"`,
      },
    });
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
