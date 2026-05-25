import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { stickers, stickersById } from "@/lib/sticker-data";
import {
  STICKEROS_BLOCK_SIZE,
  decodeStickerOsQr,
  getStickerOsErrorCode,
  indexToSticker,
} from "@/lib/stickeros";

const EMPTY_QR =
  "⋋~H4sIAAAAAAAAA/v/f+AAMwCPFVoQfQAAAA==;H4sIAAAAAAAAA2NgGEAAAKh0odt9AAAA";
const FIRST_STICKER_QR =
  "⋋~H4sIAAAAAAAAA/v3f+AAMwC+dEuQfQAAAA==;H4sIAAAAAAAAA2NgGEAAAKh0odt9AAAA";
const FIRST_TEAM_QR =
  "⋋~H4sIAAAAAAAAA/v3//3/gQLMAEGtFDl9AAAA;H4sIAAAAAAAAA2NgGEAAAKh0odt9AAAA";
const SECOND_TEAM_QR =
  "⋋~H4sIAAAAAAAAA/v3//3////+DwhgBgCAQxqofQAAAA==;H4sIAAAAAAAAA2NgGEAAAKh0odt9AAAA";
const CC_DUPLICATES_QR =
  "⋋~H4sIAAAAAAAAA/v3//3////+DwB4/58RANyBMlp9AAAA;H4sIAAAAAAAAA2NgGCggwMAEAPS2iSl9AAAA";

describe("StickerOS QR decoding", () => {
  it.each([
    [EMPTY_QR, [], []],
    [FIRST_STICKER_QR, [0], []],
    [FIRST_TEAM_QR, [0, 20], []],
    [SECOND_TEAM_QR, [0, 20, 40], []],
    [CC_DUPLICATES_QR, [0, 20, 40, 980, 993], [980, 993]],
  ])("decodes known StickerOS QR samples", (qr, ownedIndexes, duplicateIndexes) => {
    const decoded = decodeStickerOsQr(qr);

    expect(decoded.ownedIndexes).toEqual(ownedIndexes);
    expect(decoded.duplicateIndexes).toEqual(duplicateIndexes);
    expect(decoded.block1).toHaveLength(STICKEROS_BLOCK_SIZE);
    expect(decoded.block2).toHaveLength(STICKEROS_BLOCK_SIZE);
  });

  it("uses the confirmed canonical mapping", () => {
    expect(indexToSticker(0).code).toBe("FWC 00");
    expect(indexToSticker(20).code).toBe("MEX 1");
    expect(indexToSticker(40).code).toBe("RSA 1");
    expect(indexToSticker(980).code).toBe("CC 1");
    expect(indexToSticker(993).code).toBe("CC 14");
  });

  it("exposes stable stickerOsIndex values on app stickers", () => {
    expect(stickersById["fwc-trophy-00"]?.stickerOsIndex).toBe(0);
    expect(stickersById.MEX1?.stickerOsIndex).toBe(20);
    expect(stickersById.RSA1?.stickerOsIndex).toBe(40);
    expect(stickersById.CC1?.stickerOsIndex).toBe(980);
    expect(stickersById.CC14?.stickerOsIndex).toBe(993);
    expect(stickers.map((sticker) => sticker.stickerOsIndex)).toEqual(
      Array.from({ length: stickers.length }, (_, index) => index),
    );
  });

  it("does not infer duplicate quantities", () => {
    const decoded = decodeStickerOsQr(CC_DUPLICATES_QR);

    expect(decoded.duplicates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          index: 980,
          duplicateQuantity: null,
          quantityKnown: false,
        }),
        expect.objectContaining({
          index: 993,
          duplicateQuantity: null,
          quantityKnown: false,
        }),
      ]),
    );
  });

  it("accepts valid payloads without prefix and returns a warning", () => {
    const decoded = decodeStickerOsQr(EMPTY_QR.slice(2));

    expect(decoded.ownedIndexes).toEqual([]);
    expect(decoded.warnings).toEqual(["missing prefix"]);
  });

  it("rejects invalid payloads with stable error codes", () => {
    expect(() => decodeStickerOsQr("")).toThrow();
    expect(getThrownCode(() => decodeStickerOsQr(""))).toBe("STICKEROS_EMPTY_QR");
    expect(getThrownCode(() => decodeStickerOsQr("⋋xabc;def"))).toBe(
      "STICKEROS_INVALID_PREFIX",
    );
    expect(getThrownCode(() => decodeStickerOsQr("abc"))).toBe(
      "STICKEROS_INVALID_PART_COUNT",
    );
    expect(getThrownCode(() => decodeStickerOsQr("⋋~;abc"))).toBe(
      "STICKEROS_INVALID_BASE64",
    );
    expect(getThrownCode(() => decodeStickerOsQr("⋋~YWJjZA==;YWJjZA=="))).toBe(
      "STICKEROS_GZIP_DECODE_FAILED",
    );
  });

  it("rejects gzip blocks that decompress to an unsupported size", () => {
    const badBlock = gzipBase64(Buffer.from([0]));

    expect(getThrownCode(() => decodeStickerOsQr(`⋋~${badBlock};${badBlock}`))).toBe(
      "STICKEROS_INVALID_BLOCK_SIZE",
    );
  });

  it("rejects blocks that decompress to 124 bytes (not a supported sticker count)", () => {
    const badBlock = gzipBase64(Buffer.alloc(124, 0));

    expect(getThrownCode(() => decodeStickerOsQr(`⋋~${badBlock};${badBlock}`))).toBe(
      "STICKEROS_INVALID_BLOCK_SIZE",
    );
  });
});

describe("StickerOS QR decoding — 980-sticker (without CC)", () => {
  const WITHOUT_CC_QR =
    "⋋~H4sIAAAAAAAAA/v18f3f/1Dw/j89AT8AArYtXHsAAAA=;H4sIAAAAAAAAA2NhY4ADAQa6AgDevdCnewAAAA==";

  it("decodes a 980-sticker QR successfully", () => {
    const decoded = decodeStickerOsQr(WITHOUT_CC_QR);

    expect(decoded.totalStickers).toBe(980);
    expect(decoded.block1).toHaveLength(123);
    expect(decoded.block2).toHaveLength(123);
  });

  it("does not include CC sticker indexes in ownedIndexes", () => {
    const decoded = decodeStickerOsQr(WITHOUT_CC_QR);

    const ccIndexes = decoded.ownedIndexes.filter((i) => i >= 980);
    expect(ccIndexes).toHaveLength(0);
  });

  it("does not include CC sticker indexes in duplicateIndexes", () => {
    const decoded = decodeStickerOsQr(WITHOUT_CC_QR);

    const ccIndexes = decoded.duplicateIndexes.filter((i) => i >= 980);
    expect(ccIndexes).toHaveLength(0);
  });

  it("rejects a 980-sticker QR with non-zero trailing bits", () => {
    const block = Buffer.alloc(123, 0xff);
    block[block.length - 1] = 0xff;
    const badBlock = gzipBase64(block);

    const code = getThrownCode(() => decodeStickerOsQr(`⋋~${badBlock};${badBlock}`));
    expect(code).toBe("STICKEROS_INVALID_BLOCK_SIZE");
  });

  it("rejects mismatched block sizes between block1 and block2", () => {
    const block123 = gzipBase64(Buffer.alloc(123, 0));
    const block125 = gzipBase64(Buffer.alloc(125, 0));

    const code = getThrownCode(() => decodeStickerOsQr(`⋋~${block123};${block125}`));
    expect(code).toBe("STICKEROS_INVALID_BLOCK_SIZE");
  });
});

function gzipBase64(block: Buffer) {
  return gzipSync(block).toString("base64");
}

function getThrownCode(callback: () => void) {
  try {
    callback();
  } catch (error) {
    return getStickerOsErrorCode(error);
  }

  throw new Error("Expected callback to throw");
}
