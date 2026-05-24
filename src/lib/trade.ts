import { stickers, stickersById } from "@/lib/sticker-data";

export type CollectionByStickerId = Record<string, number>;

export type TradeMatches = {
  receiveIds: string[];
  giveIds: string[];
};

export type ApplyTradeResult =
  | { ok: true }
  | { ok: false; reason: "stale-duplicates" | "stale-receive" | "invalid-selection" | "locked" };

type ApplyTradeFailure = Extract<ApplyTradeResult, { ok: false }>;

export type TradeImpactItem = {
  id: string;
  code: string;
  before: number;
  after: number;
};

const stickerOrder = new Map(
  stickers.map((sticker) => [sticker.id, sticker.stickerOsIndex]),
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
  const giveSet = new Set(giveIds);
  const receiveSet = new Set(receiveIds);
  const allIds = new Set([...receiveIds, ...giveIds]);

  return sortStickerIds([...allIds]).map((id) => {
    const before = collectionByStickerId[id] ?? 0;
    let after = before;

    if (giveSet.has(id) && before > 1) {
      after = after - 1;
    }

    if (receiveSet.has(id)) {
      after = after + 1;
    }

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

  const uniqueReceiveIds = new Set(receiveIds);
  const uniqueGiveIds = new Set(giveIds);

  if (uniqueReceiveIds.size !== receiveIds.length) {
    return { ok: false, reason: "invalid-selection" };
  }

  if (uniqueGiveIds.size !== giveIds.length) {
    return { ok: false, reason: "invalid-selection" };
  }

  if (receiveIds.some((id) => uniqueGiveIds.has(id))) {
    return { ok: false, reason: "invalid-selection" };
  }

  const hasStaleGive = giveIds.some(
    (id) => (collectionByStickerId[id] ?? 0) <= 1,
  );

  if (hasStaleGive) {
    return { ok: false, reason: "stale-duplicates" };
  }

  const hasStaleReceive = receiveIds.some(
    (id) => (collectionByStickerId[id] ?? 0) > 0,
  );

  if (hasStaleReceive) {
    return { ok: false, reason: "stale-receive" };
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
    const copies = next[id] ?? 0;
    if (copies > 1) {
      next[id] = copies - 1;
    }
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
