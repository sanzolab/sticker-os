export type CollectionByStickerId = Record<string, number>;

export type CollectionSnapshotUndo = {
  beforeCollection: CollectionByStickerId;
  expectedCurrentCollection: CollectionByStickerId;
};

export function cloneCollection(
  collectionByStickerId: CollectionByStickerId,
): CollectionByStickerId {
  return { ...collectionByStickerId };
}

export function areCollectionsEqual(
  a: CollectionByStickerId,
  b: CollectionByStickerId,
) {
  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);

  if (aEntries.length !== bEntries.length) return false;

  for (const [id, copies] of aEntries) {
    if (b[id] !== copies) return false;
  }

  return true;
}

export function hasCollectionChangedSinceExpected({
  currentCollection,
  expectedCurrentCollection,
}: {
  currentCollection: CollectionByStickerId;
  expectedCurrentCollection: CollectionByStickerId;
}) {
  return !areCollectionsEqual(currentCollection, expectedCurrentCollection);
}
