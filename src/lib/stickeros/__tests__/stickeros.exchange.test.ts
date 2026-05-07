import { describe, expect, it } from "vitest";
import {
  calculateStickerOsExchange,
  decodeStickerOsQr,
  encodeStickerOsQr,
} from "@/lib/stickeros";

describe("StickerOS exchange calculation", () => {
  it("matches my duplicates against their missing stickers and vice versa", () => {
    const me = decodeStickerOsQr(
      encodeStickerOsQr({
        ownedIndexes: [0, 20, 40, 980],
        duplicateIndexes: [20, 980],
      }),
    );
    const other = decodeStickerOsQr(
      encodeStickerOsQr({
        ownedIndexes: [0, 40, 980, 993],
        duplicateIndexes: [993],
      }),
    );

    expect(calculateStickerOsExchange(me, other)).toEqual({
      iCanGive: [expect.objectContaining({ index: 20 })],
      theyCanGive: [expect.objectContaining({ index: 993 })],
      iCanGiveIndexes: [20],
      theyCanGiveIndexes: [993],
    });
  });

  it("accepts raw QR strings", () => {
    const me = encodeStickerOsQr({
      ownedIndexes: [0, 980],
      duplicateIndexes: [980],
    });
    const other = encodeStickerOsQr({
      ownedIndexes: [0],
      duplicateIndexes: [],
    });

    expect(calculateStickerOsExchange(me, other).iCanGiveIndexes).toEqual([980]);
  });
});
