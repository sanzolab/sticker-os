"use client";

import {
  parseExchangeQrPayload,
  type ExchangeQrMessageKey,
  type ParsedExchangeQrPayload,
} from "@/lib/exchange-qr";
import { stickers, stickersById } from "@/lib/sticker-data";

type CollectionByStickerId = Record<string, number>;

export type AlbumMigrationSummary = {
  collectedCount: number;
  duplicateStickerCount: number;
  ignoredStickerCount: number;
};

export type AlbumMigrationResult = {
  collectionByStickerId: CollectionByStickerId;
  summary: AlbumMigrationSummary;
  source: ParsedExchangeQrPayload["source"];
  name: string;
};

export type ParseExchangeQrForMigrationResult =
  | { ok: true; result: AlbumMigrationResult; parsed: ParsedExchangeQrPayload }
  | { ok: false; errorKey: ExchangeQrMessageKey };

export async function parseExchangeQrForMigration(
  value: string,
  signal?: AbortSignal,
): Promise<ParseExchangeQrForMigrationResult> {
  const parsed = await parseExchangeQrPayload(value, signal);

  if (!parsed.ok) {
    return { ok: false, errorKey: parsed.errorKey };
  }

  return {
    ok: true,
    result: buildAlbumStateFromMigrationQr(parsed.payload),
    parsed: parsed.payload,
  };
}

export function buildAlbumStateFromMigrationQr(
  parsed: ParsedExchangeQrPayload,
): AlbumMigrationResult {
  const knownOwned = filterKnownStickerIds(parsed.ownedIds);
  const knownMissing = filterKnownStickerIds(parsed.missingIds);
  const knownDuplicates = filterKnownStickerIds(parsed.duplicateIds);

  const ignoredStickerCount =
    parsed.unknownStickerCount +
    countUnknownStickerIds(parsed.ownedIds) +
    countUnknownStickerIds(parsed.missingIds) +
    countUnknownStickerIds(parsed.duplicateIds);

  const ownedSet = new Set(knownOwned);
  const missingSet = new Set(knownMissing);
  const duplicateSet = new Set(knownDuplicates);
  const collectionByStickerId: CollectionByStickerId = {};

  for (const sticker of stickers) {
    const id = sticker.id;

    // Precedence: duplicate > owned > missing.
    if (duplicateSet.has(id)) {
      collectionByStickerId[id] = 2;
      continue;
    }

    if (ownedSet.has(id)) {
      collectionByStickerId[id] = 1;
      continue;
    }

    if (missingSet.has(id)) {
      continue;
    }
  }

  return {
    collectionByStickerId,
    summary: {
      collectedCount: Object.keys(collectionByStickerId).length,
      duplicateStickerCount: duplicateSet.size,
      ignoredStickerCount,
    },
    source: parsed.source,
    name: parsed.name,
  };
}

function filterKnownStickerIds(ids: string[]) {
  const uniqueKnownIds = new Set<string>();
  ids.forEach((id) => {
    if (stickersById[id]) {
      uniqueKnownIds.add(id);
    }
  });
  return [...uniqueKnownIds];
}

function countUnknownStickerIds(ids: string[]) {
  return ids.filter((id) => !stickersById[id]).length;
}
