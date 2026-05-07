import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  STICKEROS_BLOCK_SIZE,
  STICKEROS_QR_PREFIX,
  decodeStickerOsQr,
  encodeStickerOsQr,
  getStickerOsErrorCode,
} from "@/lib/stickeros";

describe("StickerOS QR encoding", () => {
  it("roundtrips owned stickers without duplicates", () => {
    const qr = encodeStickerOsQr({
      ownedIndexes: [0, 20, 40],
      duplicateIndexes: [],
    });
    const decoded = decodeStickerOsQr(qr);

    expect(decoded.ownedIndexes).toEqual([0, 20, 40]);
    expect(decoded.duplicateIndexes).toEqual([]);
  });

  it("roundtrips duplicates as yes/no tradable stickers", () => {
    const qr = encodeStickerOsQr({
      ownedIndexes: [0, 20, 40, 980, 993],
      duplicateIndexes: [980, 993],
    });
    const decoded = decodeStickerOsQr(qr);

    expect(decoded.ownedIndexes).toEqual([0, 20, 40, 980, 993]);
    expect(decoded.duplicateIndexes).toEqual([980, 993]);
    expect(decoded.duplicates.every((sticker) => sticker.quantityKnown === false)).toBe(
      true,
    );
  });

  it("generates two gzip blocks that decompress to exactly 125 bytes", () => {
    const qr = encodeStickerOsQr({
      ownedIndexes: [0, 20, 40, 980, 993],
      duplicateIndexes: [980, 993],
    });
    const [block1Base64, block2Base64] = qr.slice(STICKEROS_QR_PREFIX.length).split(";");
    const block1 = gunzipSync(Buffer.from(block1Base64, "base64"));
    const block2 = gunzipSync(Buffer.from(block2Base64, "base64"));

    expect(block1).toHaveLength(STICKEROS_BLOCK_SIZE);
    expect(block2).toHaveLength(STICKEROS_BLOCK_SIZE);
    expect(block1[124] & ~0x03).toBe(0);
    expect(block2[124] & ~0x03).toBe(0);
  });

  it("never returns padding bits as stickers", () => {
    const qr = encodeStickerOsQr({
      ownedIndexes: [992, 993],
      duplicateIndexes: [993],
    });
    const decoded = decodeStickerOsQr(qr);

    expect(decoded.ownedIndexes).toEqual([992, 993]);
    expect(decoded.duplicateIndexes).toEqual([993]);
    expect(decoded.ownedIndexes.some((index) => index >= 994)).toBe(false);
    expect(decoded.duplicateIndexes.some((index) => index >= 994)).toBe(false);
  });

  it("throws in strict mode when a duplicate is not owned", () => {
    expect(
      getThrownCode(() =>
        encodeStickerOsQr(
          {
            ownedIndexes: [],
            duplicateIndexes: [980],
          },
          { strict: true },
        ),
      ),
    ).toBe("STICKEROS_DUPLICATE_NOT_OWNED");
  });

  it("adds duplicate stickers to owned stickers in non-strict mode", () => {
    const qr = encodeStickerOsQr(
      {
        ownedIndexes: [],
        duplicateIndexes: [980],
      },
      { strict: false },
    );
    const decoded = decodeStickerOsQr(qr);

    expect(decoded.ownedIndexes).toEqual([980]);
    expect(decoded.duplicateIndexes).toEqual([980]);
  });

  it("validates indexes and sticker codes", () => {
    expect(getThrownCode(() => encodeStickerOsQr({ ownedIndexes: [-1] }))).toBe(
      "STICKEROS_INDEX_OUT_OF_RANGE",
    );
    expect(getThrownCode(() => encodeStickerOsQr({ ownedIndexes: [994] }))).toBe(
      "STICKEROS_INDEX_OUT_OF_RANGE",
    );
    expect(getThrownCode(() => encodeStickerOsQr({ ownedIndexes: [1.5] }))).toBe(
      "STICKEROS_INVALID_INDEX",
    );
    expect(getThrownCode(() => encodeStickerOsQr({ ownedCodes: ["BAD 1"] }))).toBe(
      "STICKEROS_UNKNOWN_STICKER_CODE",
    );
  });
});

function getThrownCode(callback: () => void) {
  try {
    callback();
  } catch (error) {
    return getStickerOsErrorCode(error);
  }

  throw new Error("Expected callback to throw");
}
