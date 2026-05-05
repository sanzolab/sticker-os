import { describe, expect, it } from "vitest";
import { stickers } from "@/lib/sticker-data";
import {
  applyTradeToCollection,
  applyValidatedTradeToCollection,
  buildTradeMatches,
  canApplyTrade,
} from "@/lib/trade";

const [first, second, third, fourth] = stickers;

describe("trade matching", () => {
  it("matches what I can receive and what I can give", () => {
    const matches = buildTradeMatches({
      localMissingIds: [first.id, third.id],
      localDuplicateIds: [second.id],
      remoteMissingIds: [second.id, fourth.id],
      remoteDuplicateIds: [third.id, first.id],
    });

    expect(matches.receiveIds).toEqual([first.id, third.id]);
    expect(matches.giveIds).toEqual([second.id]);
  });

  it("preserves unequal trade quantities", () => {
    const matches = buildTradeMatches({
      localMissingIds: [first.id, second.id, third.id],
      localDuplicateIds: [fourth.id],
      remoteMissingIds: [fourth.id],
      remoteDuplicateIds: [first.id, second.id, third.id],
    });

    expect(matches.receiveIds).toHaveLength(3);
    expect(matches.giveIds).toHaveLength(1);
  });
});

describe("trade application", () => {
  it("decrements a given duplicate from 2 to 1", () => {
    const next = applyTradeToCollection(
      { [first.id]: 2, [second.id]: 0 },
      [second.id],
      [first.id],
    );

    expect(next[first.id]).toBe(1);
  });

  it("increments a received missing sticker from 0 to 1", () => {
    const next = applyTradeToCollection(
      { [first.id]: 2 },
      [second.id],
      [first.id],
    );

    expect(next[second.id]).toBe(1);
  });

  it("increments a received owned sticker into duplicates", () => {
    const next = applyTradeToCollection(
      { [first.id]: 2, [second.id]: 1 },
      [second.id],
      [first.id],
    );

    expect(next[second.id]).toBe(2);
  });

  it("rejects stale give selections without changing the collection", () => {
    const collection = { [first.id]: 1, [second.id]: 0 };

    expect(canApplyTrade(collection, [second.id], [first.id])).toEqual({
      ok: false,
      reason: "stale-duplicates",
    });

    const result = applyValidatedTradeToCollection(
      collection,
      [second.id],
      [first.id],
    );

    expect(result).toEqual({ ok: false, reason: "stale-duplicates" });
    expect(collection[first.id]).toBe(1);
  });

  it("applies valid trades all at once", () => {
    const result = applyValidatedTradeToCollection(
      { [first.id]: 2, [second.id]: 0, [third.id]: 1 },
      [second.id, third.id],
      [first.id],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.collectionByStickerId[first.id]).toBe(1);
    expect(result.collectionByStickerId[second.id]).toBe(1);
    expect(result.collectionByStickerId[third.id]).toBe(2);
  });

  it("rejects invalid empty selections", () => {
    expect(canApplyTrade({ [first.id]: 2 }, [], [first.id])).toEqual({
      ok: false,
      reason: "invalid-selection",
    });
  });
});
