"use client";

import {
  CORE_STICKER_COUNT,
  FULL_STICKER_COUNT,
  FULL_BITSET_BYTE_LENGTH,
  stickers,
} from "@/lib/sticker-data";

type CollectionByStickerId = Record<string, number>;

export const TRADE_QR_VERSION = 1;
export const TRADE_COLLECTION_ID = "stickeros-fwc26";
export const TRADE_DISPLAY_NAME_MAX_LENGTH = 48;
export const TRADE_BITSET_BYTE_LENGTH = FULL_BITSET_BYTE_LENGTH;
export const TRADE_DATASET_HASH = hashStickerIds(
  getStickerOsOrderedStickers().map((sticker) => sticker.id),
);
export const TRADE_CORE_DATASET_HASH = hashStickerIds(
  getStickerOsOrderedStickers()
    .slice(0, CORE_STICKER_COUNT)
    .map((sticker) => sticker.id),
);

export type TradeQrPayloadV1 = {
  v: typeof TRADE_QR_VERSION;
  c: typeof TRADE_COLLECTION_ID;
  l: number;
  h: string;
  n: string;
  m: string;
  d: string;
};

export type ParsedTradeQrPayload = {
  name: string;
  missingIds: string[];
  duplicateIds: string[];
};

export type TradeQrParseResult =
  | { ok: true; payload: ParsedTradeQrPayload }
  | { ok: false; reason: TradeQrParseError };

export type TradeQrParseError =
  | "invalid-json"
  | "invalid-shape"
  | "invalid-version"
  | "invalid-collection"
  | "invalid-length"
  | "invalid-hash"
  | "invalid-bitset";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export function sanitizeTradeDisplayName(name: string) {
  return name.trim().slice(0, TRADE_DISPLAY_NAME_MAX_LENGTH);
}

export function buildTradeQrPayload(
  collectionName: string,
  collectionByStickerId: CollectionByStickerId,
): TradeQrPayloadV1 {
  return {
    v: TRADE_QR_VERSION,
    c: TRADE_COLLECTION_ID,
    l: FULL_STICKER_COUNT,
    h: TRADE_DATASET_HASH,
    n: sanitizeTradeDisplayName(collectionName),
    m: encodeStickerBitset((stickerId) => (collectionByStickerId[stickerId] ?? 0) === 0),
    d: encodeStickerBitset((stickerId) => (collectionByStickerId[stickerId] ?? 0) > 1),
  };
}

export function serializeTradeQrPayload(payload: TradeQrPayloadV1) {
  return JSON.stringify(payload);
}

export function parseTradeQrPayload(value: string): TradeQrParseResult {
  let raw: unknown;

  try {
    raw = JSON.parse(value);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (!isTradeQrPayloadShape(raw)) {
    return { ok: false, reason: "invalid-shape" };
  }

  if (raw.v !== TRADE_QR_VERSION) {
    return { ok: false, reason: "invalid-version" };
  }

  if (raw.c !== TRADE_COLLECTION_ID) {
    return { ok: false, reason: "invalid-collection" };
  }

  if (raw.l !== FULL_STICKER_COUNT && raw.l !== CORE_STICKER_COUNT) {
    return { ok: false, reason: "invalid-length" };
  }

  if (raw.h !== TRADE_DATASET_HASH && raw.h !== TRADE_CORE_DATASET_HASH) {
    return { ok: false, reason: "invalid-hash" };
  }

  const isCore = raw.l === CORE_STICKER_COUNT;
  const missing = decodeStickerBitset(raw.m, raw.l);
  const duplicates = decodeStickerBitset(raw.d, raw.l);

  if (!missing || !duplicates) {
    return { ok: false, reason: "invalid-bitset" };
  }

  if (isCore) {
    const ccIds = getStickerOsOrderedStickers()
      .slice(CORE_STICKER_COUNT)
      .map((sticker) => sticker.id);

    const duplicateSet = new Set(duplicates);

    return {
      ok: true,
      payload: {
        name: sanitizeTradeDisplayName(raw.n),
        missingIds: [...missing, ...ccIds.filter((id) => !duplicateSet.has(id))],
        duplicateIds: duplicates,
      },
    };
  }

  return {
    ok: true,
    payload: {
      name: sanitizeTradeDisplayName(raw.n),
      missingIds: missing,
      duplicateIds: duplicates,
    },
  };
}

function isTradeQrPayloadShape(value: unknown): value is TradeQrPayloadV1 {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;

  return (
    typeof payload.v === "number" &&
    typeof payload.c === "string" &&
    typeof payload.l === "number" &&
    typeof payload.h === "string" &&
    typeof payload.n === "string" &&
    typeof payload.m === "string" &&
    typeof payload.d === "string"
  );
}

function encodeStickerBitset(matches: (stickerId: string) => boolean) {
  const bytes = new Uint8Array(TRADE_BITSET_BYTE_LENGTH);

  getStickerOsOrderedStickers().forEach((sticker) => {
    if (!matches(sticker.id)) return;
    bytes[Math.floor(sticker.stickerOsIndex / 8)] |= 1 << sticker.stickerOsIndex % 8;
  });

  return bytesToBase64Url(bytes);
}

function decodeStickerBitset(
  value: string,
  expectedStickerCount: number,
) {
  if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) {
    return null;
  }

  const bytes = base64UrlToBytes(value);

  if (!bytes || bytes.length !== Math.ceil(expectedStickerCount / 8)) {
    return null;
  }

  if (hasTrailingBits(bytes, expectedStickerCount)) {
    return null;
  }

  return getStickerOsOrderedStickers()
    .filter((sticker) => {
      if (sticker.stickerOsIndex >= expectedStickerCount) return false;
      const byte = bytes[Math.floor(sticker.stickerOsIndex / 8)];
      return (byte & (1 << sticker.stickerOsIndex % 8)) !== 0;
    })
    .map((sticker) => sticker.id);
}

function hasTrailingBits(bytes: Uint8Array, expectedStickerCount: number) {
  const usedBitsInLastByte = expectedStickerCount % 8;

  if (usedBitsInLastByte === 0) return false;

  const allowedMask = (1 << usedBitsInLastByte) - 1;
  const lastByte = bytes[bytes.length - 1] ?? 0;

  return (lastByte & ~allowedMask) !== 0;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function hashStickerIds(ids: string[]) {
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;
  const input = ids.join("\n");

  for (let index = 0; index < input.length; index += 1) {
    const char = input.charCodeAt(index);
    hashA ^= char;
    hashA = Math.imul(hashA, 0x01000193) >>> 0;
    hashB ^= char + index;
    hashB = Math.imul(hashB, 0x811c9dc5) >>> 0;
  }

  return `${hashA.toString(16).padStart(8, "0")}${hashB
    .toString(16)
    .padStart(8, "0")}`;
}

function getStickerOsOrderedStickers() {
  return [...stickers].sort((a, b) => a.stickerOsIndex - b.stickerOsIndex);
}
