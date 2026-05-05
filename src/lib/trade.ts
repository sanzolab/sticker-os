import { stickers, stickersById } from "@/lib/sticker-data";

export type CollectionByStickerId = Record<string, number>;

export type TradeMatches = {
  receiveIds: string[];
  giveIds: string[];
};

export type ApplyTradeResult =
  | { ok: true }
  | { ok: false; reason: "stale-duplicates" | "invalid-selection" };

type ApplyTradeFailure = Extract<ApplyTradeResult, { ok: false }>;

export type TradeImpactItem = {
  id: string;
  code: string;
  before: number;
  after: number;
};

const stickerOrder = new Map(
  stickers.map((sticker, index) => [sticker.id, index]),
);

export function buildTradeMatches({
  localMissingIds,
  localDuplicateIds,
  remoteMissingIds,
  remoteDuplicateIds,
}: {
  localMissingIds: string[];
  localDuplicateIds: string[];
  remoteMissingIds: string[];
  remoteDuplicateIds: string[];
}): TradeMatches {
  const localMissing = new Set(localMissingIds);
  const remoteMissing = new Set(remoteMissingIds);

  return {
    receiveIds: sortStickerIds(
      remoteDuplicateIds.filter((id) => localMissing.has(id)),
    ),
    giveIds: sortStickerIds(localDuplicateIds.filter((id) => remoteMissing.has(id))),
  };
}

export function getLocalMissingIds(collectionByStickerId: CollectionByStickerId) {
  return stickers
    .filter((sticker) => (collectionByStickerId[sticker.id] ?? 0) === 0)
    .map((sticker) => sticker.id);
}

export function getLocalDuplicateIds(
  collectionByStickerId: CollectionByStickerId,
) {
  return stickers
    .filter((sticker) => (collectionByStickerId[sticker.id] ?? 0) > 1)
    .map((sticker) => sticker.id);
}

export function previewTradeImpact(
  collectionByStickerId: CollectionByStickerId,
  receiveIds: string[],
  giveIds: string[],
): TradeImpactItem[] {
  const deltas = new Map<string, number>();

  giveIds.forEach((id) => deltas.set(id, (deltas.get(id) ?? 0) - 1));
  receiveIds.forEach((id) => deltas.set(id, (deltas.get(id) ?? 0) + 1));

  return sortStickerIds([...deltas.keys()]).map((id) => {
    const before = collectionByStickerId[id] ?? 0;
    const after = Math.max(before + (deltas.get(id) ?? 0), 0);
    return {
      id,
      code: stickersById[id]?.code ?? id,
      before,
      after,
    };
  });
}

export function canApplyTrade(
  collectionByStickerId: CollectionByStickerId,
  receiveIds: string[],
  giveIds: string[],
): ApplyTradeResult {
  if (receiveIds.length === 0 || giveIds.length === 0) {
    return { ok: false, reason: "invalid-selection" };
  }

  if (!allKnownStickerIds(receiveIds) || !allKnownStickerIds(giveIds)) {
    return { ok: false, reason: "invalid-selection" };
  }

  const uniqueGiveIds = new Set(giveIds);

  if (uniqueGiveIds.size !== giveIds.length) {
    return { ok: false, reason: "invalid-selection" };
  }

  const hasStaleDuplicate = giveIds.some(
    (id) => (collectionByStickerId[id] ?? 0) <= 1,
  );

  if (hasStaleDuplicate) {
    return { ok: false, reason: "stale-duplicates" };
  }

  return { ok: true };
}

export function applyTradeToCollection(
  collectionByStickerId: CollectionByStickerId,
  receiveIds: string[],
  giveIds: string[],
): CollectionByStickerId {
  const next = { ...collectionByStickerId };

  giveIds.forEach((id) => {
    next[id] = Math.max((next[id] ?? 0) - 1, 1);
  });

  receiveIds.forEach((id) => {
    next[id] = (next[id] ?? 0) + 1;
  });

  return next;
}

export function applyValidatedTradeToCollection(
  collectionByStickerId: CollectionByStickerId,
  receiveIds: string[],
  giveIds: string[],
):
  | { ok: true; collectionByStickerId: CollectionByStickerId }
  | ApplyTradeFailure {
  const result = canApplyTrade(collectionByStickerId, receiveIds, giveIds);

  if (!result.ok) return result;

  return {
    ok: true,
    collectionByStickerId: applyTradeToCollection(
      collectionByStickerId,
      receiveIds,
      giveIds,
    ),
  };
}

export function sortStickerIds(ids: string[]) {
  return [...ids].sort(
    (a, b) => (stickerOrder.get(a) ?? Infinity) - (stickerOrder.get(b) ?? Infinity),
  );
}

function allKnownStickerIds(ids: string[]) {
  return ids.every((id) => Boolean(stickersById[id]));
}
