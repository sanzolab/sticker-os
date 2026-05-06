import { describe, expect, it } from "vitest";
import { buildMissingTxtExport } from "@/lib/export";

describe("TXT export", () => {
  it("uses localized FWC labels in English", () => {
    const output = buildMissingTxtExport("My Album", {}, "en");

    expect(output).toContain("FWC - Specials 🏆: 00, 1, 2, 3, 4");
    expect(output).toContain("FWC - Ball and Countries 🌎: 5, 6, 7, 8");
    expect(output).toContain("FWC - History 📜: 9, 10, 11");
  });

  it("uses localized FWC labels in Spanish and keeps country abbreviations", () => {
    const output = buildMissingTxtExport("Mi Album", {}, "es");

    expect(output).toContain("FWC - Especiales 🏆: 00, 1, 2, 3, 4");
    expect(output).toContain("FWC - Balón y Países 🌎: 5, 6, 7, 8");
    expect(output).toContain("FWC - Historia 📜: 9, 10, 11");
    expect(output).toContain("ARG 🇦🇷: 1, 2, 3");
  });
});
