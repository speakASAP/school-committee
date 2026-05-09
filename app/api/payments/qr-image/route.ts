import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { toErrorResponse, AppError } from "@/types/errors";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    await getCurrentUser(requestId);

    const { searchParams } = new URL(req.url);
    const qrString = searchParams.get("q");

    if (!qrString) {
      throw new AppError("VALIDATION_ERROR", "q parameter is required", 400);
    }

    if (qrString.length > 512) {
      throw new AppError("VALIDATION_ERROR", "q parameter too long", 400);
    }

    const pngBuffer = await QRCode.toBuffer(qrString, {
      type: "png",
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
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
