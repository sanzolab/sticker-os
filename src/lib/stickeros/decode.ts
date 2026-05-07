import { gunzipSync } from "node:zlib";
import {
  STICKEROS_BLOCK_SIZE,
  STICKEROS_QR_PREFIX,
  STICKEROS_TOTAL_STICKERS,
  indexToSticker,
  type StickerOsSticker,
} from "@/lib/stickeros/album";
import { getBitPosition, isDuplicate, isOwned } from "@/lib/stickeros/bits";
import { stickerOsError } from "@/lib/stickeros/errors";

export type StickerOsDecodedSticker = StickerOsSticker & {
  byteIndex: number;
  bitIndex: number;
  duplicateQuantity?: null;
  quantityKnown?: false;
};

export type DecodedStickerOsQr = {
  format: "stickeros";
  raw: string;
  blockSize: typeof STICKEROS_BLOCK_SIZE;
  totalStickers: typeof STICKEROS_TOTAL_STICKERS;
  owned: StickerOsDecodedSticker[];
  duplicates: StickerOsDecodedSticker[];
  ownedIndexes: number[];
  duplicateIndexes: number[];
  block1: Buffer;
  block2: Buffer;
  block1Base64: string;
  block2Base64: string;
  warnings?: string[];
};

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function decodeStickerOsQr(qr: string): DecodedStickerOsQr {
  if (typeof qr !== "string" || qr.trim().length === 0) {
    throw stickerOsError("STICKEROS_EMPTY_QR", "StickerOS QR payload is empty.");
  }

  const raw = qr.trim();
  const warnings: string[] = [];
  const payload = stripPrefix(raw, warnings);
  const parts = payload.split(";");

  if (parts.length !== 2) {
    throw stickerOsError(
      "STICKEROS_INVALID_PART_COUNT",
      "StickerOS QR payload must contain exactly two gzip base64 blocks.",
    );
  }

  const [block1Base64, block2Base64] = parts;
  const block1 = decodeBlock(block1Base64, "Block 1");
  const block2 = decodeBlock(block2Base64, "Block 2");
  const owned: StickerOsDecodedSticker[] = [];
  const duplicates: StickerOsDecodedSticker[] = [];
  const ownedIndexes: number[] = [];
  const duplicateIndexes: number[] = [];

  for (let index = 0; index < STICKEROS_TOTAL_STICKERS; index += 1) {
    const bitPosition = getBitPosition(index);
    const sticker = {
      ...indexToSticker(index),
      byteIndex: bitPosition.byteIndex,
      bitIndex: bitPosition.bitIndex,
    };

    if (isOwned(block1, index)) {
      owned.push(sticker);
      ownedIndexes.push(index);
    }

    if (isDuplicate(block2, index)) {
      duplicates.push({
        ...sticker,
        duplicateQuantity: null,
        quantityKnown: false,
      });
      duplicateIndexes.push(index);
    }
  }

  return {
    format: "stickeros",
    raw,
    blockSize: STICKEROS_BLOCK_SIZE,
    totalStickers: STICKEROS_TOTAL_STICKERS,
    owned,
    duplicates,
    ownedIndexes,
    duplicateIndexes,
    block1,
    block2,
    block1Base64,
    block2Base64,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function hasSticker(decoded: DecodedStickerOsQr, index: number) {
  return decoded.ownedIndexes.includes(index);
}

export function hasDuplicate(decoded: DecodedStickerOsQr, index: number) {
  return decoded.duplicateIndexes.includes(index);
}

export function getMissingIndexes(decoded: DecodedStickerOsQr) {
  const owned = new Set(decoded.ownedIndexes);

  return Array.from({ length: STICKEROS_TOTAL_STICKERS }, (_, index) => index).filter(
    (index) => !owned.has(index),
  );
}

export function getTradableIndexes(decoded: DecodedStickerOsQr) {
  return decoded.duplicateIndexes;
}

function stripPrefix(raw: string, warnings: string[]) {
  if (raw.startsWith(STICKEROS_QR_PREFIX)) {
    return raw.slice(STICKEROS_QR_PREFIX.length);
  }

  if (raw.startsWith("⋋")) {
    throw stickerOsError(
      "STICKEROS_INVALID_PREFIX",
      `StickerOS QR prefix must be ${STICKEROS_QR_PREFIX}.`,
    );
  }

  warnings.push("missing prefix");
  return raw;
}

function decodeBlock(value: string, label: string) {
  if (!isValidBase64(value)) {
    throw stickerOsError(
      "STICKEROS_INVALID_BASE64",
      `${label} must be a non-empty base64 string.`,
    );
  }

  let decompressed: Buffer;

  try {
    decompressed = gunzipSync(Buffer.from(value, "base64"));
  } catch {
    throw stickerOsError(
      "STICKEROS_GZIP_DECODE_FAILED",
      `${label} could not be decompressed as gzip.`,
    );
  }

  if (decompressed.length !== STICKEROS_BLOCK_SIZE) {
    throw stickerOsError(
      "STICKEROS_INVALID_BLOCK_SIZE",
      `${label} must decompress to exactly ${STICKEROS_BLOCK_SIZE} bytes.`,
    );
  }

  return decompressed;
}

function isValidBase64(value: string) {
  return value.length > 0 && value.length % 4 === 0 && BASE64_PATTERN.test(value);
}
