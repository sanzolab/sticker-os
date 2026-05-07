import { gzipSync } from "node:zlib";
import {
  STICKEROS_QR_PREFIX,
  STICKEROS_TOTAL_STICKERS,
  stickerToIndex,
} from "@/lib/stickeros/album";
import {
  createEmptyDuplicateBlock,
  createEmptyOwnedBlock,
  normalizePaddingBits,
  setDuplicate,
  setOwned,
} from "@/lib/stickeros/bits";
import { stickerOsError } from "@/lib/stickeros/errors";

export type StickerOsEncodeInput = {
  ownedIndexes?: number[];
  duplicateIndexes?: number[];
  ownedCodes?: string[];
  duplicateCodes?: string[];
};

export type StickerOsEncodeOptions = {
  strict?: boolean;
};

export function encodeStickerOsQr(
  input: StickerOsEncodeInput,
  options: StickerOsEncodeOptions = {},
): string {
  const strict = options.strict ?? true;
  const ownedIndexes = normalizeIndexes([
    ...(input.ownedIndexes ?? []),
    ...codesToIndexes(input.ownedCodes ?? []),
  ]);
  const duplicateIndexes = normalizeIndexes([
    ...(input.duplicateIndexes ?? []),
    ...codesToIndexes(input.duplicateCodes ?? []),
  ]);
  const owned = new Set(ownedIndexes);

  for (const duplicateIndex of duplicateIndexes) {
    if (owned.has(duplicateIndex)) continue;

    if (strict) {
      throw stickerOsError(
        "STICKEROS_DUPLICATE_NOT_OWNED",
        `Duplicate sticker index ${duplicateIndex} must also be owned.`,
      );
    }

    owned.add(duplicateIndex);
  }

  const normalizedOwnedIndexes = [...owned].sort((a, b) => a - b);
  const block1 = createEmptyOwnedBlock();
  const block2 = createEmptyDuplicateBlock();

  normalizedOwnedIndexes.forEach((index) => setOwned(block1, index));
  duplicateIndexes.forEach((index) => {
    setDuplicate(block2, index);
    setOwned(block1, index);
  });

  normalizePaddingBits(block1);
  normalizePaddingBits(block2);

  const block1Base64 = gzipSync(block1, { level: 9 }).toString("base64");
  const block2Base64 = gzipSync(block2, { level: 9 }).toString("base64");

  return `${STICKEROS_QR_PREFIX}${block1Base64};${block2Base64}`;
}

function codesToIndexes(codes: string[]) {
  return codes.map((code) => {
    try {
      return stickerToIndex(code);
    } catch {
      throw stickerOsError(
        "STICKEROS_UNKNOWN_STICKER_CODE",
        `Unknown StickerOS sticker code: ${code}.`,
      );
    }
  });
}

function normalizeIndexes(indexes: number[]) {
  if (!Array.isArray(indexes)) {
    throw stickerOsError(
      "STICKEROS_INVALID_INDEXES",
      "StickerOS indexes must be provided as an array.",
    );
  }

  indexes.forEach((index) => {
    if (!Number.isInteger(index)) {
      throw stickerOsError(
        "STICKEROS_INVALID_INDEX",
        `StickerOS index must be an integer: ${index}.`,
      );
    }

    if (index < 0 || index >= STICKEROS_TOTAL_STICKERS) {
      throw stickerOsError(
        "STICKEROS_INDEX_OUT_OF_RANGE",
        `StickerOS index out of range: ${index}.`,
      );
    }
  });

  return [...new Set(indexes)].sort((a, b) => a - b);
}
