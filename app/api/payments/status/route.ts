import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { toErrorResponse, AppError, UnauthenticatedError } from "@/types/errors";
import { getPaymentStatusForYear } from "@/lib/db/payments";
import { currentSchoolYear } from "@/lib/payments/qr-generator";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);
    const schoolYear = currentSchoolYear();
    const status = await getPaymentStatusForYear(user.id, schoolYear);

    return NextResponse.json({ schoolYear, ...status }, { status: 200 });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ schoolYear: currentSchoolYear(), paid: false }, { status: 200 });
    }
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
