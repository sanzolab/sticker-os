import { describe, expect, it } from "vitest";
import { stickers } from "@/lib/sticker-data";
import {
  applyTradeToCollection,
  applyValidatedTradeToCollection,
  buildTradeMatches,
  canApplyTrade,
  previewTradeImpact,
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
      { [first.id]: 2, [second.id]: 0, [third.id]: 3, [fourth.id]: 0 },
      [second.id, fourth.id],
      [first.id, third.id],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.collectionByStickerId[first.id]).toBe(1);
    expect(result.collectionByStickerId[second.id]).toBe(1);
    expect(result.collectionByStickerId[third.id]).toBe(2);
    expect(result.collectionByStickerId[fourth.id]).toBe(1);
  });

  it("rejects invalid empty selections", () => {
    expect(canApplyTrade({ [first.id]: 2 }, [], [first.id])).toEqual({
      ok: false,
      reason: "invalid-selection",
    });
  });

  it("rejects duplicate receive IDs", () => {
    expect(
      canApplyTrade(
        { [first.id]: 2, [second.id]: 0 },
        [second.id, second.id],
        [first.id],
      ),
    ).toEqual({ ok: false, reason: "invalid-selection" });
  });

  it("rejects overlapping receive and give IDs", () => {
    expect(
      canApplyTrade(
        { [first.id]: 2, [second.id]: 0 },
        [second.id, first.id],
        [first.id, third.id],
      ),
    ).toEqual({ ok: false, reason: "invalid-selection" });
  });

  it("rejects a stale receive sticker the user already owns", () => {
    const collection = { [first.id]: 2, [second.id]: 1 };

    expect(canApplyTrade(collection, [second.id], [first.id])).toEqual({
      ok: false,
      reason: "stale-receive",
    });
  });

  it("does not decrement a give sticker with only 1 copy", () => {
    const next = applyTradeToCollection(
      { [first.id]: 1, [second.id]: 0 },
      [second.id],
      [first.id],
    );

    expect(next[first.id]).toBe(1);
  });

  it("does not create copies from a missing give sticker", () => {
    const next = applyTradeToCollection(
      { [first.id]: 0, [second.id]: 0 },
      [second.id],
      [first.id],
    );

    expect(next[first.id]).toBe(0);
  });
});

describe("previewTradeImpact", () => {
  it("shows give sticker decremented from 2 to 1", () => {
    const impact = previewTradeImpact(
      { [first.id]: 2, [second.id]: 0 },
      [second.id],
      [first.id],
    );

    expect(impact).toEqual([
      { id: first.id, code: first.code, before: 2, after: 1 },
      { id: second.id, code: second.code, before: 0, after: 1 },
    ]);
  });

  it("shows give sticker unchanged when only 1 copy", () => {
    const impact = previewTradeImpact(
      { [first.id]: 1, [second.id]: 0 },
      [second.id],
      [first.id],
    );

    expect(impact).toEqual([
      { id: first.id, code: first.code, before: 1, after: 1 },
      { id: second.id, code: second.code, before: 0, after: 1 },
    ]);
  });

  it("matches applyTradeToCollection output exactly", () => {
    const collection = { [first.id]: 2, [second.id]: 0, [third.id]: 1 };
    const receiveIds = [second.id, third.id];
    const giveIds = [first.id];

    const impact = previewTradeImpact(collection, receiveIds, giveIds);
    const next = applyTradeToCollection(collection, receiveIds, giveIds);

    for (const item of impact) {
      expect(next[item.id]).toBe(item.after);
    }
  });
});
