import { NextResponse } from "next/server";
import {
  decodeStickerOsQr,
  encodeStickerOsQr,
  getStickerOsErrorCode,
  type StickerOsQrErrorCode,
} from "@/lib/stickeros";

export const runtime = "nodejs";

type EncodeRequest = {
  mode: "encode";
  ownedIndexes?: number[];
  duplicateIndexes?: number[];
};

type DecodeRequest = {
  mode: "decode";
  qr?: string;
};

type StickerOsQrRequest = EncodeRequest | DecodeRequest;

export async function POST(request: Request) {
  let body: StickerOsQrRequest;

  try {
    body = (await request.json()) as StickerOsQrRequest;
  } catch {
    return errorResponse("STICKEROS_INVALID_INDEXES", "Request body must be JSON.");
  }

  try {
    if (body.mode === "encode") {
      const qr = encodeStickerOsQr(
        {
          ownedIndexes: body.ownedIndexes ?? [],
          duplicateIndexes: body.duplicateIndexes ?? [],
        },
        { strict: false },
      );

      return NextResponse.json({ qr });
    }

    if (body.mode === "decode") {
      const decoded = decodeStickerOsQr(body.qr ?? "");

      return NextResponse.json({
        format: decoded.format,
        ownedIndexes: decoded.ownedIndexes,
        duplicateIndexes: decoded.duplicateIndexes,
        warnings: decoded.warnings,
      });
    }

    return errorResponse("STICKEROS_INVALID_INDEXES", "Unknown QR request mode.");
  } catch (error) {
    const code = getStickerOsErrorCode(error) ?? "STICKEROS_INVALID_INDEXES";
    const message = error instanceof Error ? error.message : "StickerOS QR failed.";

    return errorResponse(code, message);
  }
}

function errorResponse(code: StickerOsQrErrorCode, message: string) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
    },
    { status: 400 },
  );
}
