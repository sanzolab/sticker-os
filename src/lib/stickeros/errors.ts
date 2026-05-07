export type StickerOsQrErrorCode =
  | "STICKEROS_EMPTY_QR"
  | "STICKEROS_INVALID_PREFIX"
  | "STICKEROS_INVALID_PART_COUNT"
  | "STICKEROS_INVALID_BASE64"
  | "STICKEROS_GZIP_DECODE_FAILED"
  | "STICKEROS_INVALID_BLOCK_SIZE"
  | "STICKEROS_INVALID_INDEXES"
  | "STICKEROS_INVALID_INDEX"
  | "STICKEROS_INDEX_OUT_OF_RANGE"
  | "STICKEROS_UNKNOWN_STICKER_CODE"
  | "STICKEROS_DUPLICATE_NOT_OWNED";

export class StickerOsQrError extends Error {
  code: StickerOsQrErrorCode;

  constructor(code: StickerOsQrErrorCode, message: string) {
    super(message);
    this.name = "StickerOsQrError";
    this.code = code;
  }
}

export function stickerOsError(code: StickerOsQrErrorCode, message: string) {
  return new StickerOsQrError(code, message);
}

export function getStickerOsErrorCode(error: unknown) {
  return error instanceof StickerOsQrError ? error.code : null;
}
