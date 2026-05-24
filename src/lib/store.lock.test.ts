import { describe, expect, it, beforeEach } from "vitest";
import { useStickerStore } from "@/lib/store";
import { stickers } from "@/lib/sticker-data";

function resetStore() {
  useStickerStore.setState({
    isLocked: false,
    lastBlockedAttemptAt: null,
    collectionByStickerId: {},
    searchQuery: "",
  });
}

describe("store lock", () => {
  beforeEach(() => {
    resetStore();
  });

  it("defaults isLocked to false", () => {
    expect(useStickerStore.getState().isLocked).toBe(false);
  });

  it("toggleLock flips isLocked", () => {
    useStickerStore.getState().toggleLock();
    expect(useStickerStore.getState().isLocked).toBe(true);

    useStickerStore.getState().toggleLock();
    expect(useStickerStore.getState().isLocked).toBe(false);
  });

  it("triggerBlockedFeedback updates lastBlockedAttemptAt", () => {
    const before = Date.now();
    useStickerStore.getState().triggerBlockedFeedback();
    const after = useStickerStore.getState().lastBlockedAttemptAt;
    expect(after).toBeGreaterThanOrEqual(before);
    expect(typeof after).toBe("number");
  });

  it("tapSticker returns false when locked and does not mutate collection", () => {
    useStickerStore.setState({ isLocked: true });
    const id = stickers[0].id;
    const result = useStickerStore.getState().tapSticker(id);
    expect(result).toBe(false);
    expect(useStickerStore.getState().collectionByStickerId[id]).toBeUndefined();
    expect(useStickerStore.getState().lastBlockedAttemptAt).not.toBeNull();
  });

  it("tapSticker returns true and mutates when unlocked", () => {
    const id = stickers[0].id;
    const result = useStickerStore.getState().tapSticker(id);
    expect(result).toBe(true);
    expect(useStickerStore.getState().collectionByStickerId[id]).toBe(1);
  });

  it("removeSticker returns false when locked", () => {
    const id = stickers[0].id;
    useStickerStore.setState({
      collectionByStickerId: { [id]: 1 },
      isLocked: true,
    });
    const result = useStickerStore.getState().removeSticker(id);
    expect(result).toBe(false);
    expect(useStickerStore.getState().collectionByStickerId[id]).toBe(1);
    expect(useStickerStore.getState().lastBlockedAttemptAt).not.toBeNull();
  });

  it("removeSticker returns true and mutates when unlocked", () => {
    const id = stickers[0].id;
    useStickerStore.setState({ collectionByStickerId: { [id]: 1 } });
    const result = useStickerStore.getState().removeSticker(id);
    expect(result).toBe(true);
    expect(useStickerStore.getState().collectionByStickerId[id]).toBeUndefined();
  });

  it("setStickerCopies returns false when locked", () => {
    const id = stickers[0].id;
    useStickerStore.setState({
      collectionByStickerId: { [id]: 1 },
      isLocked: true,
    });
    const result = useStickerStore.getState().setStickerCopies(id, 5);
    expect(result).toBe(false);
    expect(useStickerStore.getState().collectionByStickerId[id]).toBe(1);
    expect(useStickerStore.getState().lastBlockedAttemptAt).not.toBeNull();
  });

  it("setStickerCopies returns true and mutates when unlocked", () => {
    const id = stickers[0].id;
    useStickerStore.setState({ collectionByStickerId: { [id]: 1 } });
    const result = useStickerStore.getState().setStickerCopies(id, 5);
    expect(result).toBe(true);
    expect(useStickerStore.getState().collectionByStickerId[id]).toBe(5);
  });

  it("setCollectionByStickerId returns false when locked without force", () => {
    useStickerStore.setState({ isLocked: true });
    const newCollection = { [stickers[0].id]: 1 };
    const result = useStickerStore.getState().setCollectionByStickerId(newCollection);
    expect(result).toBe(false);
    expect(useStickerStore.getState().lastBlockedAttemptAt).not.toBeNull();
  });

  it("setCollectionByStickerId succeeds with force when locked", () => {
    useStickerStore.setState({ isLocked: true });
    const newCollection = { [stickers[0].id]: 1 };
    const result = useStickerStore
      .getState()
      .setCollectionByStickerId(newCollection, { force: true, reason: "undo" });
    expect(result).toBe(true);
    expect(useStickerStore.getState().collectionByStickerId[stickers[0].id]).toBe(1);
  });

  it("resetCollection returns false when locked", () => {
    const id = stickers[0].id;
    useStickerStore.setState({
      collectionByStickerId: { [id]: 1 },
      isLocked: true,
    });
    const result = useStickerStore.getState().resetCollection();
    expect(result).toBe(false);
    expect(useStickerStore.getState().collectionByStickerId[id]).toBe(1);
    expect(useStickerStore.getState().lastBlockedAttemptAt).not.toBeNull();
  });

  it("resetCollection returns true and clears when unlocked", () => {
    const id = stickers[0].id;
    useStickerStore.setState({ collectionByStickerId: { [id]: 1 } });
    const result = useStickerStore.getState().resetCollection();
    expect(result).toBe(true);
    expect(useStickerStore.getState().collectionByStickerId[id]).toBeUndefined();
  });

  it("applyTrade returns locked reason when locked", () => {
    useStickerStore.setState({ isLocked: true });
    const result = useStickerStore.getState().applyTrade([], []);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("locked");
    expect(useStickerStore.getState().lastBlockedAttemptAt).not.toBeNull();
  });

  it("toggleLock is not blocked by the lock itself", () => {
    useStickerStore.setState({ isLocked: true });
    expect(useStickerStore.getState().isLocked).toBe(true);
    useStickerStore.getState().toggleLock();
    expect(useStickerStore.getState().isLocked).toBe(false);
  });
});
