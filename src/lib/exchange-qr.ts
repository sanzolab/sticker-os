"use client";

import { stickers, stickersByStickerOsIndex } from "@/lib/sticker-data";
import {
  parseTradeQrPayload,
  type TradeQrParseError,
} from "@/lib/trade-qr";

type StickerOsDecodeResponse = {
  format: "stickeros";
  ownedIndexes: number[];
  duplicateIndexes: number[];
};

export type ExchangeQrMessageKey =
  | "trade.error.invalidCollection"
  | "trade.error.invalidLength"
  | "trade.error.invalidHash"
  | "trade.error.invalidVersion"
  | "trade.error.invalidBitset"
  | "trade.error.invalidQr";

export type ParsedExchangeQrPayload = {
  source: "stickeros" | "legacy-trade";
  name: string;
  missingIds: string[];
  ownedIds: string[];
  duplicateIds: string[];
  unknownStickerCount: number;
};

export type ParseExchangeQrResult =
  | { ok: true; payload: ParsedExchangeQrPayload }
  | { ok: false; errorKey: ExchangeQrMessageKey };

export async function parseExchangeQrPayload(
  value: string,
  signal?: AbortSignal,
): Promise<ParseExchangeQrResult> {
  if (signal?.aborted) {
    return { ok: false, errorKey: "trade.error.invalidQr" };
  }

  const stickerOs = await requestStickerOsQrDecode(value, signal);

  if (signal?.aborted) {
    return { ok: false, errorKey: "trade.error.invalidQr" };
  }

  if (stickerOs.ok) {
    const owned = new Set<string>();
    let unknownStickerCount = 0;

    stickerOs.payload.ownedIndexes.forEach((index) => {
      const sticker = stickersByStickerOsIndex[index];
      if (!sticker) {
        unknownStickerCount += 1;
        return;
      }
      owned.add(sticker.id);
    });

    const duplicate = new Set<string>();
    stickerOs.payload.duplicateIndexes.forEach((index) => {
      const sticker = stickersByStickerOsIndex[index];
      if (!sticker) {
        unknownStickerCount += 1;
        return;
      }
      duplicate.add(sticker.id);
    });

    const missingIds = stickers
      .filter((sticker) => !owned.has(sticker.id))
      .map((sticker) => sticker.id);

    return {
      ok: true,
      payload: {
        source: "stickeros",
        name: "",
        missingIds,
        ownedIds: stickers
          .filter((sticker) => owned.has(sticker.id))
          .map((sticker) => sticker.id),
        duplicateIds: stickers
          .filter((sticker) => duplicate.has(sticker.id))
          .map((sticker) => sticker.id),
        unknownStickerCount,
      },
    };
  }

  const legacy = parseTradeQrPayload(value);

  if (!legacy.ok) {
    return { ok: false, errorKey: getTradeParseMessageKey(legacy.reason) };
  }

  const missing = new Set(legacy.payload.missingIds);
  const duplicate = new Set(legacy.payload.duplicateIds);

  return {
    ok: true,
    payload: {
      source: "legacy-trade",
      name: legacy.payload.name,
      missingIds: stickers
        .filter((sticker) => missing.has(sticker.id))
        .map((sticker) => sticker.id),
      ownedIds: stickers
        .filter((sticker) => !missing.has(sticker.id))
        .map((sticker) => sticker.id),
      duplicateIds: stickers
        .filter((sticker) => duplicate.has(sticker.id))
        .map((sticker) => sticker.id),
      unknownStickerCount: 0,
    },
  };
}

async function requestStickerOsQrDecode(
  value: string,
  signal?: AbortSignal,
): Promise<
  | { ok: true; payload: StickerOsDecodeResponse }
  | { ok: false }
> {
  try {
    const response = await fetch("/api/stickeros/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "decode", qr: value }),
      signal,
    });

    if (!response.ok) return { ok: false };

    return {
      ok: true,
      payload: (await response.json()) as StickerOsDecodeResponse,
    };
  } catch {
    return { ok: false };
  }
}

export function getTradeParseMessageKey(
  reason: TradeQrParseError,
): ExchangeQrMessageKey {
  switch (reason) {
    case "invalid-collection":
    case "invalid-length":
    case "invalid-hash":
      return "trade.error.invalidCollection";
    case "invalid-version":
      return "trade.error.invalidVersion";
    case "invalid-bitset":
      return "trade.error.invalidBitset";
    default:
      return "trade.error.invalidQr";
  }
}
