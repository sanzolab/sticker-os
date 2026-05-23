import { stickers } from "@/lib/sticker-data";
import { getSharedAlbumSnapshotFromCollection } from "@/lib/shared-album-link";

export type ImportStrategy = "replace" | "add" | "highest";

type CollectionByStickerId = Record<string, number>;

type ImportSummary = {
  collected: number;
  duplicateCopies: number;
  completion: number;
};

export type ImportPreview = {
  current: ImportSummary;
  shared: ImportSummary;
  result: ImportSummary;
};

const MAX_STICKER_COPIES = 999;

export function hasLocalAlbumProgress(collectionByStickerId: CollectionByStickerId) {
  return stickers.some((sticker) => (collectionByStickerId[sticker.id] ?? 0) > 0);
}

export function applyImportStrategy({
  localCollectionByStickerId,
  sharedCollectionByStickerId,
  strategy,
}: {
  localCollectionByStickerId: CollectionByStickerId;
  sharedCollectionByStickerId: CollectionByStickerId;
  strategy: ImportStrategy;
}) {
  const local = sanitizeCollection(localCollectionByStickerId);
  const shared = sanitizeCollection(sharedCollectionByStickerId);
  const next: CollectionByStickerId = {};

  for (const sticker of stickers) {
    const localCopies = local[sticker.id] ?? 0;
    const sharedCopies = shared[sticker.id] ?? 0;

    let copies = 0;
    if (strategy === "replace") {
      copies = sharedCopies;
    } else if (strategy === "add") {
      copies = Math.min(localCopies + sharedCopies, MAX_STICKER_COPIES);
    } else {
      copies = Math.max(localCopies, sharedCopies);
    }

    if (copies > 0) next[sticker.id] = copies;
  }

  return next;
}

export function buildImportPreview({
  localCollectionByStickerId,
  sharedCollectionByStickerId,
  strategy,
}: {
  localCollectionByStickerId: CollectionByStickerId;
  sharedCollectionByStickerId: CollectionByStickerId;
  strategy: ImportStrategy;
}): ImportPreview {
  const resultCollection = applyImportStrategy({
    localCollectionByStickerId,
    sharedCollectionByStickerId,
    strategy,
  });

  const current = getSharedAlbumSnapshotFromCollection({
    collectionByStickerId: localCollectionByStickerId,
  });
  const shared = getSharedAlbumSnapshotFromCollection({
    collectionByStickerId: sharedCollectionByStickerId,
  });
  const result = getSharedAlbumSnapshotFromCollection({
    collectionByStickerId: resultCollection,
  });

  return {
    current: {
      collected: current.stats.collected,
      duplicateCopies: current.stats.duplicateCopies,
      completion: current.stats.completion,
    },
    shared: {
      collected: shared.stats.collected,
      duplicateCopies: shared.stats.duplicateCopies,
      completion: shared.stats.completion,
    },
    result: {
      collected: result.stats.collected,
      duplicateCopies: result.stats.duplicateCopies,
      completion: result.stats.completion,
    },
  };
}

function sanitizeCollection(value: CollectionByStickerId): CollectionByStickerId {
  const next: CollectionByStickerId = {};

  for (const sticker of stickers) {
    const copies = value[sticker.id] ?? 0;
    if (
      typeof copies === "number" &&
      Number.isInteger(copies) &&
      copies > 0 &&
      copies <= MAX_STICKER_COPIES
    ) {
      next[sticker.id] = copies;
    }
  }

  return next;
}

