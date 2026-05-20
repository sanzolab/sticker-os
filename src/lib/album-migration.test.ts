import { describe, expect, it } from "vitest";
import { buildAlbumStateFromMigrationQr } from "@/lib/album-migration";
import { stickers } from "@/lib/sticker-data";
import type { ParsedExchangeQrPayload } from "@/lib/exchange-qr";

const [first, second, third] = stickers;

describe("album migration adapter", () => {
  it("imports duplicated stickers as total copies 2", () => {
    const payload = buildPayload({
      ownedIds: [first.id],
      duplicateIds: [first.id],
    });

    const result = buildAlbumStateFromMigrationQr(payload);

    expect(result.collectionByStickerId[first.id]).toBe(2);
    expect(result.summary.duplicateStickerCount).toBe(1);
  });

  it("does not inflate quantities for repeated duplicate indications", () => {
    const payload = buildPayload({
      ownedIds: [first.id],
      duplicateIds: [first.id, first.id, first.id],
    });

    const result = buildAlbumStateFromMigrationQr(payload);

    expect(result.collectionByStickerId[first.id]).toBe(2);
    expect(result.summary.duplicateStickerCount).toBe(1);
  });

  it("imports owned-only stickers as total copies 1", () => {
    const payload = buildPayload({
      ownedIds: [first.id, second.id],
      duplicateIds: [],
    });

    const result = buildAlbumStateFromMigrationQr(payload);

    expect(result.collectionByStickerId[first.id]).toBe(1);
    expect(result.collectionByStickerId[second.id]).toBe(1);
    expect(result.collectionByStickerId[third.id]).toBeUndefined();
  });

  it("lets duplicate category win when an ID appears in multiple categories", () => {
    const payload = buildPayload({
      ownedIds: [first.id],
      missingIds: [first.id],
      duplicateIds: [first.id],
    });

    const result = buildAlbumStateFromMigrationQr(payload);

    expect(result.collectionByStickerId[first.id]).toBe(2);
  });

  it("ignores unknown IDs and reports ignored count", () => {
    const payload = buildPayload({
      ownedIds: [first.id, "UNKNOWN_1"],
      missingIds: ["UNKNOWN_2"],
      duplicateIds: [second.id, "UNKNOWN_3"],
      unknownStickerCount: 2,
    });

    const result = buildAlbumStateFromMigrationQr(payload);

    expect(result.collectionByStickerId[first.id]).toBe(1);
    expect(result.collectionByStickerId[second.id]).toBe(2);
    expect(result.collectionByStickerId.UNKNOWN_1).toBeUndefined();
    expect(result.collectionByStickerId.UNKNOWN_2).toBeUndefined();
    expect(result.collectionByStickerId.UNKNOWN_3).toBeUndefined();
    expect(result.summary.ignoredStickerCount).toBe(5);
  });

  it("maps legacy and StickerOS payloads to the same collection model", () => {
    const ownedIds = [first.id, second.id];
    const duplicateIds = [second.id];
    const missingIds = stickers
      .filter((sticker) => !ownedIds.includes(sticker.id))
      .map((sticker) => sticker.id);

    const legacy = buildPayload({
      source: "legacy-trade",
      ownedIds,
      missingIds,
      duplicateIds,
    });
    const stickerOs = buildPayload({
      source: "stickeros",
      ownedIds,
      missingIds,
      duplicateIds,
    });

    const legacyResult = buildAlbumStateFromMigrationQr(legacy);
    const stickerOsResult = buildAlbumStateFromMigrationQr(stickerOs);

    expect(legacyResult.collectionByStickerId).toEqual(
      stickerOsResult.collectionByStickerId,
    );
  });
});

function buildPayload(
  overrides: Partial<ParsedExchangeQrPayload>,
): ParsedExchangeQrPayload {
  const ownedIds = overrides.ownedIds ?? [];
  const missingIds = overrides.missingIds ?? [];
  const duplicateIds = overrides.duplicateIds ?? [];

  return {
    source: overrides.source ?? "stickeros",
    name: overrides.name ?? "",
    ownedIds,
    missingIds,
    duplicateIds,
    unknownStickerCount: overrides.unknownStickerCount ?? 0,
  };
}
