import { describe, expect, it } from "vitest";
import { stickers } from "@/lib/sticker-data";
import {
  applyImportStrategy,
  buildImportPreview,
  hasLocalAlbumProgress,
} from "@/lib/shared-album-import";

const [first, second, third] = stickers;

describe("shared album import strategies", () => {
  it("replaces with shared collection", () => {
    const result = applyImportStrategy({
      localCollectionByStickerId: { [first.id]: 4, [second.id]: 1 },
      sharedCollectionByStickerId: { [first.id]: 1, [third.id]: 2 },
      strategy: "replace",
    });

    expect(result[first.id]).toBe(1);
    expect(result[second.id]).toBeUndefined();
    expect(result[third.id]).toBe(2);
  });

  it("adds local and shared counts", () => {
    const result = applyImportStrategy({
      localCollectionByStickerId: { [first.id]: 4, [second.id]: 1 },
      sharedCollectionByStickerId: { [first.id]: 1, [third.id]: 2 },
      strategy: "add",
    });

    expect(result[first.id]).toBe(5);
    expect(result[second.id]).toBe(1);
    expect(result[third.id]).toBe(2);
  });

  it("keeps highest count", () => {
    const result = applyImportStrategy({
      localCollectionByStickerId: { [first.id]: 4, [second.id]: 1 },
      sharedCollectionByStickerId: { [first.id]: 1, [third.id]: 2 },
      strategy: "highest",
    });

    expect(result[first.id]).toBe(4);
    expect(result[second.id]).toBe(1);
    expect(result[third.id]).toBe(2);
  });

  it("detects local album progress", () => {
    expect(hasLocalAlbumProgress({})).toBe(false);
    expect(hasLocalAlbumProgress({ [first.id]: 1 })).toBe(true);
  });

  it("builds comparison preview by strategy", () => {
    const preview = buildImportPreview({
      localCollectionByStickerId: { [first.id]: 1, [second.id]: 1 },
      sharedCollectionByStickerId: { [first.id]: 2, [third.id]: 1 },
      strategy: "highest",
    });

    expect(preview.current.collected).toBe(2);
    expect(preview.shared.collected).toBe(2);
    expect(preview.result.collected).toBe(3);
    expect(preview.current.duplicateCopies).toBe(0);
    expect(preview.shared.duplicateCopies).toBe(1);
    expect(preview.result.duplicateCopies).toBe(1);
  });
});

