import { describe, expect, it } from "vitest";
import { stickers } from "@/lib/sticker-data";
import {
  TRADE_BITSET_BYTE_LENGTH,
  TRADE_COLLECTION_ID,
  TRADE_DATASET_HASH,
  TRADE_DISPLAY_NAME_MAX_LENGTH,
  TRADE_QR_VERSION,
  buildTradeQrPayload,
  parseTradeQrPayload,
  sanitizeTradeDisplayName,
  serializeTradeQrPayload,
  type TradeQrPayloadV1,
} from "@/lib/trade-qr";

describe("trade QR payloads", () => {
  it("roundtrips encoded missing and duplicate stickers", () => {
    const collection = {
      [stickers[0].id]: 2,
      [stickers[1].id]: 1,
    };

    const parsed = parseTradeQrPayload(
      serializeTradeQrPayload(buildTradeQrPayload(" StickerOS ", collection)),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.payload.name).toBe("StickerOS");
    expect(parsed.payload.duplicateIds).toEqual([stickers[0].id]);
    expect(parsed.payload.missingIds).not.toContain(stickers[0].id);
    expect(parsed.payload.missingIds).not.toContain(stickers[1].id);
    expect(parsed.payload.missingIds).toContain(stickers[2].id);
  });

  it("rejects invalid version, collection, length, and hash", () => {
    const payload = buildTradeQrPayload("StickerOS", {});

    expect(parseReason(withPatch(payload, { v: 2 }))).toBe(
      "invalid-version",
    );
    expect(parseReason(withPatch(payload, { c: "other" }))).toBe(
      "invalid-collection",
    );
    expect(parseReason(withPatch(payload, { l: payload.l + 1 }))).toBe(
      "invalid-length",
    );
    expect(parseReason(withPatch(payload, { h: "bad-hash" }))).toBe(
      "invalid-hash",
    );
  });

  it("rejects malformed bitsets and wrong decoded byte lengths", () => {
    const payload = buildTradeQrPayload("StickerOS", {});

    expect(parseReason(withPatch(payload, { m: "not valid" }))).toBe(
      "invalid-bitset",
    );
    expect(parseReason(withPatch(payload, { m: "A" }))).toBe(
      "invalid-bitset",
    );
    expect(parseReason(withPatch(payload, { m: encodeBytes([0]) }))).toBe(
      "invalid-bitset",
    );
  });

  it("rejects bitsets with trailing bits set beyond the sticker count", () => {
    const payload = buildTradeQrPayload("StickerOS", {});
    const bytes = new Uint8Array(TRADE_BITSET_BYTE_LENGTH);
    const usedBitsInLastByte = stickers.length % 8;
    bytes[bytes.length - 1] = 1 << usedBitsInLastByte;

    expect(
      parseReason(withPatch(payload, { d: encodeBytes([...bytes]) })),
    ).toBe("invalid-bitset");
  });

  it("sanitizes the display name", () => {
    const name = `  ${"A".repeat(TRADE_DISPLAY_NAME_MAX_LENGTH + 10)}  `;

    expect(sanitizeTradeDisplayName(name)).toHaveLength(
      TRADE_DISPLAY_NAME_MAX_LENGTH,
    );
  });

  it("uses the local dataset contract", () => {
    const payload = buildTradeQrPayload("StickerOS", {});

    expect(payload.v).toBe(TRADE_QR_VERSION);
    expect(payload.c).toBe(TRADE_COLLECTION_ID);
    expect(payload.l).toBe(stickers.length);
    expect(payload.h).toBe(TRADE_DATASET_HASH);
  });
});

function withPatch(payload: TradeQrPayloadV1, patch: Record<string, unknown>) {
  return JSON.stringify({ ...payload, ...patch });
}

function parseReason(value: string) {
  const result = parseTradeQrPayload(value);
  if (result.ok) throw new Error("Expected payload to be rejected");
  return result.reason;
}

function encodeBytes(bytes: number[]) {
  return Buffer.from(bytes).toString("base64url");
}
