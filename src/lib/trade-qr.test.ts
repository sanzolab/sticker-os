import { describe, expect, it } from "vitest";
import { stickers, CORE_STICKER_COUNT, FULL_STICKER_COUNT, CORE_BITSET_BYTE_LENGTH } from "@/lib/sticker-data";
import {
  TRADE_BITSET_BYTE_LENGTH,
  TRADE_COLLECTION_ID,
  TRADE_DATASET_HASH,
  TRADE_CORE_DATASET_HASH,
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
    expect(payload.l).toBe(FULL_STICKER_COUNT);
    expect(payload.h).toBe(TRADE_DATASET_HASH);
  });
});

describe("trade QR payloads — 980-sticker (without CC)", () => {
  it("parses a short QR (l=980) with the core hash and 123-byte bitsets", () => {
    const payload = JSON.stringify({
      v: TRADE_QR_VERSION,
      c: TRADE_COLLECTION_ID,
      l: CORE_STICKER_COUNT,
      h: TRADE_CORE_DATASET_HASH,
      n: "CoreOnly",
      m: Buffer.alloc(CORE_BITSET_BYTE_LENGTH, 0).toString("base64url"),
      d: Buffer.alloc(CORE_BITSET_BYTE_LENGTH, 0).toString("base64url"),
    });

    const result = parseTradeQrPayload(payload);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payload.name).toBe("CoreOnly");
  });

  it("appends CC sticker IDs to missingIds for short QRs", () => {
    const ccIds = stickers
      .filter((s) => s.category === "cc")
      .map((s) => s.id);

    const payload = JSON.stringify({
      v: TRADE_QR_VERSION,
      c: TRADE_COLLECTION_ID,
      l: CORE_STICKER_COUNT,
      h: TRADE_CORE_DATASET_HASH,
      n: "",
      m: Buffer.alloc(CORE_BITSET_BYTE_LENGTH, 0).toString("base64url"),
      d: Buffer.alloc(CORE_BITSET_BYTE_LENGTH, 0).toString("base64url"),
    });

    const result = parseTradeQrPayload(payload);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payload.duplicateIds).not.toContain(ccIds[0]);
    expect(result.payload.missingIds).toEqual(
      expect.arrayContaining(ccIds),
    );
  });

  it("rejects length 981 (not a supported sticker count)", () => {
    const payload = JSON.stringify({
      v: TRADE_QR_VERSION,
      c: TRADE_COLLECTION_ID,
      l: 981,
      h: TRADE_CORE_DATASET_HASH,
      n: "",
      m: "",
      d: "",
    });

    expect(parseReason(payload)).toBe("invalid-length");
  });

  it("rejects length 988 (not a supported sticker count)", () => {
    const payload = JSON.stringify({
      v: TRADE_QR_VERSION,
      c: TRADE_COLLECTION_ID,
      l: 988,
      h: TRADE_CORE_DATASET_HASH,
      n: "",
      m: "",
      d: "",
    });

    expect(parseReason(payload)).toBe("invalid-length");
  });

  it("rejects length 995 (not a supported sticker count)", () => {
    const payload = JSON.stringify({
      v: TRADE_QR_VERSION,
      c: TRADE_COLLECTION_ID,
      l: 995,
      h: TRADE_DATASET_HASH,
      n: "",
      m: "",
      d: "",
    });

    expect(parseReason(payload)).toBe("invalid-length");
  });

  it("rejects a hash that matches neither full nor core", () => {
    const payload = JSON.stringify({
      v: TRADE_QR_VERSION,
      c: TRADE_COLLECTION_ID,
      l: FULL_STICKER_COUNT,
      h: "bad-hash",
      n: "",
      m: "",
      d: "",
    });

    expect(parseReason(payload)).toBe("invalid-hash");
  });

  it("rejects 123-byte bitsets when l=994", () => {
    const fullPayload = buildTradeQrPayload("StickerOS", {});

    expect(
      parseReason(withPatch(fullPayload, {
        l: FULL_STICKER_COUNT,
        h: TRADE_DATASET_HASH,
        m: Buffer.alloc(CORE_BITSET_BYTE_LENGTH, 0).toString("base64url"),
      })),
    ).toBe("invalid-bitset");
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
