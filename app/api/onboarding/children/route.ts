import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import type { OnboardingChildrenRequest, ChildInput } from "@/types/onboarding";

const ROUTE = "/api/onboarding/children";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);
    const body = (await req.json()) as OnboardingChildrenRequest;

    if (!body.tenantId || !body.schoolId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce a školy jsou povinná", 400);
    }
    if (!Array.isArray(body.children) || body.children.length === 0) {
      throw new AppError("VALIDATION_ERROR", "Je vyžadováno alespoň jedno dítě", 400);
    }

    for (const child of body.children as ChildInput[]) {
      if (!child.firstName?.trim()) {
        throw new AppError("VALIDATION_ERROR", "Každé dítě musí mít křestní jméno", 400);
      }
      if (!child.lastName?.trim()) {
        throw new AppError("VALIDATION_ERROR", "Každé dítě musí mít příjmení", 400);
      }
      if (!child.classId) {
        throw new AppError("VALIDATION_ERROR", "Každé dítě musí mít přiřazenou třídu", 400);
      }
    }

    // Delete any previously saved children for this parent (idempotent resubmit)
    await db.child.deleteMany({ where: { parentUserId: user.id } });

    const children = await db.$transaction(
      (body.children as ChildInput[]).map((child) =>
        db.child.create({
          data: {
            parentUserId: user.id,
            schoolId: body.schoolId,
            classId: child.classId,
            firstName: child.firstName.trim(),
            lastName: child.lastName.trim(),
            notes: child.notes?.trim() ?? null,
            parentConsent: true,
          },
        }),
      ),
    );

    await writeAuditEvent({
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      actorUserId: user.id,
      action: "onboarding.children_saved",
      entityType: "child",
      entityId: user.id,
      metadata: { count: children.length },
      requestId,
    });

    logger.info("onboarding/children: children saved", {
      request_id: requestId,
      route: ROUTE,
      user_id: user.id,
      count: children.length,
    });

    return NextResponse.json({ children: children.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })) }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("onboarding/children: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("onboarding/children: unexpected error", {
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
