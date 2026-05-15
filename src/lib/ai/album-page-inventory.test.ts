import { describe, expect, it } from "vitest";
import { buildFinalInventoryFromMissingOnly } from "@/lib/ai/album-page-inventory";

describe("buildFinalInventoryFromMissingOnly", () => {
  it("infers presentes by complement on a full team page", () => {
    const result = buildFinalInventoryFromMissingOnly({
      pageType: "team",
      country: "Mexico",
      group: "MEX",
      isFullTeamPage: true,
      imageQuality: "good",
      faltantes: [
        { group: "MEX", number: "7" },
        { group: "MEX", number: "9" },
        { group: "MEX", number: "10" },
      ],
      uncertainEmptySlots: [],
      warnings: [],
    });

    expect(result.status).toBe("ok");
    expect(result.presentes.map((item) => item.number)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "8",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
    ]);
  });

  it("deduplicates duplicate faltantes and excludes uncertain readable numbers", () => {
    const result = buildFinalInventoryFromMissingOnly({
      pageType: "team",
      country: "Mexico",
      group: "MEX",
      isFullTeamPage: true,
      imageQuality: "ok",
      faltantes: [
        { group: "MEX", number: "7" },
        { group: "MEX", number: "7" },
      ],
      uncertainEmptySlots: [
        { group: "MEX", number: "12", reason: "blurred" },
        { group: "MEX", number: "12", reason: "duplicate" },
      ],
      warnings: [],
    });

    expect(result.faltantes).toEqual([{ group: "MEX", number: "7" }]);
    expect(result.presentes.some((item) => item.number === "12")).toBe(false);
    expect(result.uncertain).toEqual([{ group: "MEX", number: "12", reason: "blurred" }]);
  });

  it("returns needs_review for non-team pages", () => {
    const result = buildFinalInventoryFromMissingOnly({
      pageType: "cc",
      country: null,
      group: "CC",
      isFullTeamPage: false,
      imageQuality: "good",
      faltantes: [{ group: "CC", number: "4" }],
      uncertainEmptySlots: [],
      warnings: [],
    });

    expect(result.status).toBe("needs_review");
    expect(result.presentes).toEqual([]);
  });

  it("returns needs_review for partial team pages", () => {
    const result = buildFinalInventoryFromMissingOnly({
      pageType: "team",
      country: "Mexico",
      group: "MEX",
      isFullTeamPage: false,
      imageQuality: "good",
      faltantes: [{ group: "MEX", number: "4" }],
      uncertainEmptySlots: [],
      warnings: [],
    });

    expect(result.status).toBe("needs_review");
    expect(result.presentes).toEqual([]);
  });

  it("returns needs_review when group is missing", () => {
    const result = buildFinalInventoryFromMissingOnly({
      pageType: "team",
      country: "Mexico",
      group: null,
      isFullTeamPage: true,
      imageQuality: "good",
      faltantes: [{ group: null, number: "4" }],
      uncertainEmptySlots: [],
      warnings: [],
    });

    expect(result.status).toBe("needs_review");
    expect(result.presentes).toEqual([]);
  });

  it("returns needs_review when image quality is poor", () => {
    const result = buildFinalInventoryFromMissingOnly({
      pageType: "team",
      country: "Mexico",
      group: "MEX",
      isFullTeamPage: true,
      imageQuality: "poor",
      faltantes: [{ group: "MEX", number: "4" }],
      uncertainEmptySlots: [],
      warnings: [],
    });

    expect(result.status).toBe("needs_review");
    expect(result.presentes).toEqual([]);
  });

  it("ignores invalid team numbers with warnings", () => {
    const result = buildFinalInventoryFromMissingOnly({
      pageType: "team",
      country: "Mexico",
      group: "MEX",
      isFullTeamPage: true,
      imageQuality: "good",
      faltantes: [
        { group: "MEX", number: "0" },
        { group: "MEX", number: "21" },
        { group: "MEX", number: "abc" },
      ],
      uncertainEmptySlots: [],
      warnings: [],
    });

    expect(result.faltantes).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes("invalid team faltante number"))).toBe(true);
  });

  it("ignores model-presentes field with warning", () => {
    const result = buildFinalInventoryFromMissingOnly({
      pageType: "team",
      country: "Mexico",
      group: "MEX",
      isFullTeamPage: true,
      imageQuality: "good",
      faltantes: [],
      uncertainEmptySlots: [],
      warnings: [],
      presentes: [{ group: "MEX", number: "1" }],
    });

    expect(result.warnings.some((warning) => warning.includes("ignored"))).toBe(true);
    expect(result.presentes).toHaveLength(20);
  });
});
