import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { db } from "@/lib/db/client";
import { toErrorResponse, AppError } from "@/types/errors";

// Returns whether any child with the given name+class is already registered
// by another parent (indicating a shared-family sibling).
export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);
    const body = (await req.json()) as {
      children: Array<{ firstName: string; lastName: string; classId: string }>;
      schoolId: string;
    };

    if (!body.schoolId || !Array.isArray(body.children)) {
      throw new AppError("VALIDATION_ERROR", "Neplatný požadavek", 400);
    }

    let familyMatchFound = false;

    for (const child of body.children) {
      if (!child.firstName || !child.lastName || !child.classId) continue;

      const sibling = await db.child.findFirst({
        where: {
          firstName: { equals: child.firstName.trim(), mode: "insensitive" },
          lastName: { equals: child.lastName.trim(), mode: "insensitive" },
          classId: child.classId,
          schoolId: body.schoolId,
          parentUserId: { not: user.id },
        },
        select: { id: true },
      });

      if (sibling) {
        familyMatchFound = true;
        break;
      }
    }

    return NextResponse.json({ familyMatchFound }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
