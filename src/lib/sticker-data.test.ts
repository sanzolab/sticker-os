import { describe, expect, it } from "vitest";
import {
  getCompactStickerCode,
  getCompactStickerLabel,
  getLocalizedCountryDisplayName,
  getStickerExportLabel,
  getStickerSearchValues,
  normalizeStickerSearchText,
  stickerGroups,
  stickers,
} from "@/lib/sticker-data";
import type { Locale } from "@/lib/i18n";

function searchValuesInclude(
  stickerId: string,
  locale: Locale,
  query: string,
) {
  const sticker = stickers.find((item) => item.id === stickerId);
  if (!sticker) throw new Error(`Sticker not found: ${stickerId}`);

  const normalizedQuery = normalizeStickerSearchText(query);

  return getStickerSearchValues(sticker, locale).some((value) =>
    normalizeStickerSearchText(value).includes(normalizedQuery),
  );
}

describe("sticker locale metadata", () => {
  it("localizes FWC export labels and keeps country labels abbreviated", () => {
    const trophyGroup = stickerGroups.find((group) => group.id === "fwc-trophy");
    const argentinaGroup = stickerGroups.find((group) => group.id === "arg");

    if (!trophyGroup || !argentinaGroup) {
      throw new Error("Expected sticker groups to exist");
    }

    expect(getStickerExportLabel(trophyGroup, "en")).toBe("FWC - Specials 🏆");
    expect(getStickerExportLabel(trophyGroup, "es")).toBe(
      "FWC - Especiales 🏆",
    );
    expect(getStickerExportLabel(argentinaGroup, "es")).toBe("ARG 🇦🇷");
  });

  it("matches Spanish searches with and without accents", () => {
    expect(searchValuesInclude("fwc-trophy-1", "es", "especiales")).toBe(true);
    expect(searchValuesInclude("fwc-world-5", "es", "balon")).toBe(true);
    expect(searchValuesInclude("fwc-world-5", "es", "balón")).toBe(true);
    expect(searchValuesInclude("fwc-history-9", "es", "historia")).toBe(true);
    expect(searchValuesInclude("ARG1", "es", "escudo")).toBe(true);
    expect(searchValuesInclude("ARG13", "es", "equipo")).toBe(true);
  });

  it("keeps English searches working", () => {
    expect(searchValuesInclude("fwc-trophy-1", "en", "specials")).toBe(true);
    expect(searchValuesInclude("fwc-world-5", "en", "ball")).toBe(true);
    expect(searchValuesInclude("fwc-history-9", "en", "history")).toBe(true);
    expect(searchValuesInclude("ARG1", "en", "shield")).toBe(true);
    expect(searchValuesInclude("ARG13", "en", "team")).toBe(true);
  });

  it("formats compact exchange labels from structured metadata", () => {
    const fwc = stickers.find((item) => item.id === "fwc-trophy-00");
    const mexico = stickers.find((item) => item.id === "MEX11");
    const usa = stickers.find((item) => item.id === "USA18");
    const cocaCola = stickers.find((item) => item.id === "CC14");

    if (!fwc || !mexico || !usa || !cocaCola) {
      throw new Error("Expected sticker fixtures to exist");
    }

    expect(getCompactStickerLabel(fwc, "es")).toEqual({
      primary: "FWC",
      secondary: "00",
      detail: "Especiales",
    });
    expect(getCompactStickerLabel(mexico, "en")).toEqual({
      primary: "MEX",
      secondary: "11",
      detail: "Mexico",
    });
    expect(getCompactStickerLabel(usa, "en")).toEqual({
      primary: "USA",
      secondary: "18",
      detail: "United States",
    });
    expect(getCompactStickerLabel(cocaCola, "en")).toEqual({
      primary: "CC",
      secondary: "14",
      detail: "Coca Cola",
    });

    expect(getCompactStickerCode(fwc)).toBe("FWC 00");
    expect(getCompactStickerCode(mexico)).toBe("MEX 11");
    expect(getCompactStickerCode(usa)).toBe("USA 18");
    expect(getCompactStickerCode(cocaCola)).toBe("CC 14");
  });

  it("localizes country display names for the visual UI", () => {
    expect(getLocalizedCountryDisplayName("MEX", "es")).toBe("México");
    expect(getLocalizedCountryDisplayName("USA", "es")).toBe("Estados Unidos");
    expect(getLocalizedCountryDisplayName("ESP", "es")).toBe("España");
    expect(getLocalizedCountryDisplayName("USA", "en")).toBe("United States");
  });
});
