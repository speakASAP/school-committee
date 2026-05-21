import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
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
  const { type } = await params;
  const ROUTE = `/api/admin/exports/${type}`;

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Export CSV vyžaduje roli administrátora", 403);
    }

    if (!ALLOWED_EXPORT_TYPES.includes(type as ExportType)) {
      throw new AppError("VALIDATION_ERROR", `Typ exportu musí být jeden z: ${ALLOWED_EXPORT_TYPES.join(", ")}`, 400);
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || process.env.DEFAULT_SCHOOL_ID;
    const tenantId = searchParams.get("tenantId") || process.env.DEFAULT_TENANT_ID || schoolId;
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "ID školy je povinné", 400);
    if (!tenantId) throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);

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

    logger.info("exports: CSV export generated", {
      request_id: requestId,
      route: ROUTE,
      export_type: type,
      record_count: recordCount,
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
      logger.error("exports: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("exports: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
