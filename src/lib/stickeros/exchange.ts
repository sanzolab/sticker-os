import { STICKEROS_TOTAL_STICKERS, indexToSticker } from "@/lib/stickeros/album";
import {
  decodeStickerOsQr,
  type DecodedStickerOsQr,
} from "@/lib/stickeros/decode";

export type StickerOsExchangeResult = {
  iCanGive: ReturnType<typeof indexToSticker>[];
  theyCanGive: ReturnType<typeof indexToSticker>[];
  iCanGiveIndexes: number[];
  theyCanGiveIndexes: number[];
};

export function calculateStickerOsExchange(
  me: DecodedStickerOsQr | string,
  other: DecodedStickerOsQr | string,
): StickerOsExchangeResult {
  const myQr = typeof me === "string" ? decodeStickerOsQr(me) : me;
  const otherQr = typeof other === "string" ? decodeStickerOsQr(other) : other;
  const myMissing = getMissingSet(myQr.ownedIndexes);
  const otherMissing = getMissingSet(otherQr.ownedIndexes);
  const iCanGiveIndexes = myQr.duplicateIndexes.filter((index) =>
    otherMissing.has(index),
  );
  const theyCanGiveIndexes = otherQr.duplicateIndexes.filter((index) =>
    myMissing.has(index),
  );

  return {
    iCanGive: iCanGiveIndexes.map(indexToSticker),
    theyCanGive: theyCanGiveIndexes.map(indexToSticker),
    iCanGiveIndexes,
    theyCanGiveIndexes,
  };
}

function getMissingSet(ownedIndexes: number[]) {
  const owned = new Set(ownedIndexes);
  const missing = new Set<number>();

  for (let index = 0; index < STICKEROS_TOTAL_STICKERS; index += 1) {
    if (!owned.has(index)) missing.add(index);
  }

  return missing;
}
