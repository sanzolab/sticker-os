import { describe, expect, it, vi } from "vitest";
import {
  parseStickersFromInput,
  parseTextDeterministically,
} from "@/lib/ai/parse-stickers";
import { parseVoiceTranscriptDeterministically } from "@/lib/ai/deterministic";

describe("deterministic sticker parsing", () => {
  it.each([
    ["Mexico 13", "MEX 13"],
    ["add Mexico sticker 13", "MEX 13"],
    ["add sticker 13 from Mexico", "MEX 13"],
    ["México 13", "MEX 13"],
    ["MEX13", "MEX 13"],
    ["MEX 13", "MEX 13"],
    ["FWC 00", "FWC 00"],
    ["FWC 19", "FWC 19"],
    ["Coca Cola 14", "CC 14"],
    ["Coke 14", "CC 14"],
    ["add the Coca Cola 14", "CC 14"],
    ["CC14", "CC 14"],
    ["CC 14", "CC 14"],
    ["agrega la ficha 13 de México", "MEX 13"],
    ["agrega México 13", "MEX 13"],
    ["México trece", "MEX 13"],
    ["agrega Coca Cola 14", "CC 14"],
    ["Coca Cola catorce", "CC 14"],
    ["ce ce catorce", "CC 14"],
    ["FWC cero cero", "FWC 00"],
    ["FWC diecinueve", "FWC 19"],
    ["add Mexico 13", "MEX 13"],
    ["Mexico thirteen", "MEX 13"],
    ["CC fourteen", "CC 14"],
    ["FWC zero zero", "FWC 00"],
    ["FWC nineteen", "FWC 19"],
  ])("resolves %s to %s", (input, code) => {
    const result = parseTextDeterministically(input);

    expect(result.unresolved).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sticker.code).toBeDefined();
    expect(`${getGroupCode(result.candidates[0]!.sticker)} ${result.candidates[0]!.sticker.number}`).toBe(code);
  });

  it("resolves comma-separated sticker lists", () => {
    const result = parseTextDeterministically("MEX 13, CC14, FWC 00");

    expect(result.unresolved).toEqual([]);
    expect(result.candidates.map((candidate) => {
      return `${getGroupCode(candidate.sticker)} ${candidate.sticker.number}`;
    })).toEqual(["MEX 13", "CC 14", "FWC 00"]);
  });

  it("resolves Spanish and English voice transcripts without locale input", () => {
    const spanishResult = parseTextDeterministically("México trece y Coca Cola catorce");
    const englishResult = parseTextDeterministically("Mexico thirteen and CC fourteen");

    expect(spanishResult.unresolved).toEqual([]);
    expect(spanishResult.candidates.map((candidate) => {
      return `${getGroupCode(candidate.sticker)} ${candidate.sticker.number}`;
    })).toEqual(["MEX 13", "CC 14"]);

    expect(englishResult.unresolved).toEqual([]);
    expect(englishResult.candidates.map((candidate) => {
      return `${getGroupCode(candidate.sticker)} ${candidate.sticker.number}`;
    })).toEqual(["MEX 13", "CC 14"]);
  });

  it("parses country-number voice pairs split by commas", () => {
    const result = parseVoiceTranscriptDeterministically(
      "Colombia 14, Mexico 3, Argentina 8",
    );

    expect(result.unresolved).toEqual([]);
    expect(result.needsFallback).toBe(false);
    expect(getStickerCodes(result)).toEqual(["COL 14", "MEX 3", "ARG 8"]);
  });

  it("parses single country + number", () => {
    const result = parseVoiceTranscriptDeterministically("colombia 11");

    expect(result.unresolved).toEqual([]);
    expect(result.needsFallback).toBe(false);
    expect(getStickerCodes(result)).toEqual(["COL 11"]);
  });

  it("parses same-country burst and flags fallback when a number is out-of-range", () => {
    const result = parseVoiceTranscriptDeterministically(
      "colombia 1 14 15 16 18 22 11",
    );

    expect(result.needsFallback).toBe(true);
    expect(result.unmatchedTokens).toContain("22");
    expect(getStickerCodes(result)).toEqual([
      "COL 1",
      "COL 14",
      "COL 15",
      "COL 16",
      "COL 18",
      "COL 11",
    ]);
  });

  it("parses multiple country blocks from one utterance", () => {
    const result = parseVoiceTranscriptDeterministically(
      "colombia 11, estados unidos 11, mexico 11",
    );

    expect(result.unresolved).toEqual([]);
    expect(result.needsFallback).toBe(false);
    expect(getStickerCodes(result)).toEqual(["COL 11", "USA 11", "MEX 11"]);
  });

  it("parses adjacent country blocks without commas", () => {
    const result = parseVoiceTranscriptDeterministically("argentina 7 8 mexico 5");

    expect(result.unresolved).toEqual([]);
    expect(result.needsFallback).toBe(false);
    expect(getStickerCodes(result)).toEqual(["ARG 7", "ARG 8", "MEX 5"]);
  });

  it("matches Spanish and English aliases with accent/phonetic variants", () => {
    const result = parseVoiceTranscriptDeterministically(
      "francia 13 germany 7 brasil 11 japon 4 belgica 9 catar 5 corea 6 costa de marfil 8 republica checa 10",
    );

    expect(result.needsFallback).toBe(false);
    expect(getStickerCodes(result)).toEqual([
      "FRA 13",
      "GER 7",
      "BRA 11",
      "JPN 4",
      "BEL 9",
      "QAT 5",
      "KOR 6",
      "CIV 8",
      "CZE 10",
    ]);
  });

  it("handles common phonetic confusions in country names", () => {
    const result = parseVoiceTranscriptDeterministically("vrasil 10 gana 6");

    expect(result.needsFallback).toBe(false);
    expect(getStickerCodes(result)).toEqual(["BRA 10", "GHA 6"]);
  });

  it("normalizes FWC edge forms and rejects FWC out-of-range values", () => {
    const zero = parseVoiceTranscriptDeterministically("FWC 0");
    const doubleZero = parseVoiceTranscriptDeterministically("FWC 00");
    const nineteen = parseVoiceTranscriptDeterministically("FWC 19");
    const outOfRange = parseVoiceTranscriptDeterministically("FWC 20");

    expect(getStickerCodes(zero)).toEqual(["FWC 00"]);
    expect(getStickerCodes(doubleZero)).toEqual(["FWC 00"]);
    expect(getStickerCodes(nineteen)).toEqual(["FWC 19"]);
    expect(getStickerCodes(outOfRange)).toEqual([]);
    expect(outOfRange.needsFallback).toBe(true);
  });

  it("rejoins split FWC/CC letter forms", () => {
    const fwcLetters = parseVoiceTranscriptDeterministically("F W C 0");
    const fwcMixed = parseVoiceTranscriptDeterministically("F WC 19");
    const fwcCompactSplit = parseVoiceTranscriptDeterministically("fw c1");
    const fwcCompact = parseVoiceTranscriptDeterministically("FWC1");
    const ccLetters = parseVoiceTranscriptDeterministically("C C 14");
    const ccCompactSplit = parseVoiceTranscriptDeterministically("c c14");
    const ccCompact = parseVoiceTranscriptDeterministically("cc14");

    expect(getStickerCodes(fwcLetters)).toEqual(["FWC 00"]);
    expect(getStickerCodes(fwcMixed)).toEqual(["FWC 19"]);
    expect(getStickerCodes(fwcCompactSplit)).toEqual(["FWC 1"]);
    expect(getStickerCodes(fwcCompact)).toEqual(["FWC 1"]);
    expect(getStickerCodes(ccLetters)).toEqual(["CC 14"]);
    expect(getStickerCodes(ccCompactSplit)).toEqual(["CC 14"]);
    expect(getStickerCodes(ccCompact)).toEqual(["CC 14"]);
    expect(fwcLetters.needsFallback).toBe(false);
    expect(fwcMixed.needsFallback).toBe(false);
    expect(fwcCompactSplit.needsFallback).toBe(false);
    expect(fwcCompact.needsFallback).toBe(false);
    expect(ccLetters.needsFallback).toBe(false);
    expect(ccCompactSplit.needsFallback).toBe(false);
    expect(ccCompact.needsFallback).toBe(false);
  });

  it("supports special spoken aliases for FWC and CC groups", () => {
    const especial = parseVoiceTranscriptDeterministically("especial 0");
    const special = parseVoiceTranscriptDeterministically("special 19");
    const coca = parseVoiceTranscriptDeterministically("coca 1");
    const cocaCola = parseVoiceTranscriptDeterministically("coca cola 14");

    expect(getStickerCodes(especial)).toEqual(["FWC 00"]);
    expect(getStickerCodes(special)).toEqual(["FWC 19"]);
    expect(getStickerCodes(coca)).toEqual(["CC 1"]);
    expect(getStickerCodes(cocaCola)).toEqual(["CC 14"]);
    expect(especial.needsFallback).toBe(false);
    expect(special.needsFallback).toBe(false);
    expect(coca.needsFallback).toBe(false);
    expect(cocaCola.needsFallback).toBe(false);
  });

  it("applies CC range constraints (1..14)", () => {
    const valid = parseVoiceTranscriptDeterministically("CC 1 14");
    const invalid = parseVoiceTranscriptDeterministically("CC 0 15");

    expect(getStickerCodes(valid)).toEqual(["CC 1", "CC 14"]);
    expect(getStickerCodes(invalid)).toEqual([]);
    expect(invalid.needsFallback).toBe(true);
  });

  it("applies country range constraints (1..20)", () => {
    const valid = parseVoiceTranscriptDeterministically("mexico 1 20");
    const invalid = parseVoiceTranscriptDeterministically("mexico 0 21");

    expect(getStickerCodes(valid)).toEqual(["MEX 1", "MEX 20"]);
    expect(getStickerCodes(invalid)).toEqual([]);
    expect(invalid.needsFallback).toBe(true);
  });

  it("flags fallback when an utterance mixes valid and invalid numbers", () => {
    const result = parseVoiceTranscriptDeterministically("mexico 13 21 cc 0 14 fwc 20 19");

    expect(getStickerCodes(result)).toEqual(["MEX 13", "CC 14", "FWC 19"]);
    expect(result.needsFallback).toBe(true);
  });

  it("sets fallback when orphan numbers or unknown country-like words remain", () => {
    const orphanNumber = parseVoiceTranscriptDeterministically("mexico 13 44");
    const unknownCountry = parseVoiceTranscriptDeterministically("senegal 4 fransia 13");
    const failedCodes = parseVoiceTranscriptDeterministically("fw q");
    const failedSingle = parseVoiceTranscriptDeterministically("c 14");

    expect(orphanNumber.needsFallback).toBe(true);
    expect(orphanNumber.unmatchedTokens).toContain("44");
    expect(unknownCountry.needsFallback).toBe(true);
    expect(unknownCountry.unmatchedFragments.some((fragment) => fragment.includes("fransia"))).toBe(true);
    expect(failedCodes.needsFallback).toBe(true);
    expect(failedSingle.needsFallback).toBe(true);
  });

  it("supports compact explicit code forms as secondary deterministic path", () => {
    const result = parseVoiceTranscriptDeterministically("MEX13 FWC00 CC14");

    expect(result.needsFallback).toBe(false);
    expect(getStickerCodes(result).sort()).toEqual(["CC 14", "FWC 00", "MEX 13"]);
  });

  it.each([
    "Mexico 13",
    "México 13",
    "MEX13",
    "MEX 13",
    "FWC 00",
    "FWC 19",
    "Coca Cola 14",
    "Coke 14",
    "CC14",
    "CC 14",
    "agrega la ficha 13 de México",
    "México trece",
    "Coca Cola catorce",
    "ce ce catorce",
    "FWC cero cero",
    "FWC diecinueve",
    "Mexico thirteen",
    "CC fourteen",
    "FWC zero zero",
    "FWC nineteen",
    "MEX 13, CC14, FWC 00",
  ])("does not call the AI provider for deterministic text: %s", async (text) => {
    const providerParser = vi.fn();

    const result = await parseStickersFromInput(
      {
        type: "text",
        text,
      },
      { providerParser },
    );

    expect(providerParser).not.toHaveBeenCalled();
    expect(result.provider).toBe("deterministic");
  });

  it("calls the AI provider when text is ambiguous", async () => {
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: [],
        unresolved: [{ rawText: "sticker 13", reason: "Missing group/team" }],
      },
    });

    const result = await parseStickersFromInput(
      {
        type: "text",
        text: "sticker 13",
      },
      { providerParser },
    );

    expect(providerParser).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe("gemini");
    expect(result.unresolved).toEqual([
      { rawText: "sticker 13", reason: "Missing group/team" },
    ]);
  });

  it("preserves deterministic candidates when only unresolved text needs AI", async () => {
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: [{ rawText: "Coca Cola 14", code: "CC 14", confidence: 0.9 }],
        unresolved: [],
      },
    });

    const result = await parseStickersFromInput(
      {
        type: "text",
        source: "voice-transcript",
        text: "México trece y sticker 14",
      },
      { providerParser },
    );

    expect(providerParser).toHaveBeenCalledWith({
      type: "text",
      source: "voice-transcript",
      text: "sticker 14",
    });
    expect(result.provider).toBe("gemini");
    expect(result.candidates.map((candidate) => candidate.code)).toEqual([
      "MEX 13",
      "CC 14",
    ]);
  });

  it("returns missing-group text as unresolved", () => {
    const result = parseTextDeterministically("sticker 13");

    expect(result.candidates).toEqual([]);
    expect(result.unresolved).toEqual([
      {
        rawText: "sticker 13",
        reason: "Missing group or team.",
      },
    ]);
  });

  it("returns invalid groups as unresolved", () => {
    const result = parseTextDeterministically("Atlantis 13");

    expect(result.candidates).toEqual([]);
    expect(result.unresolved[0]?.reason).toBe("Could not resolve to a known sticker.");
  });

  it("returns invalid numbers as unresolved", () => {
    const result = parseTextDeterministically("Mexico 21");

    expect(result.candidates).toEqual([]);
    expect(result.unresolved[0]?.reason).toBe("Could not resolve to a known sticker.");
  });

  it("de-duplicates duplicate deterministic candidates", () => {
    const result = parseTextDeterministically("MEX13 and Mexico 13 and México 13");

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sticker.id).toBe("MEX13");
  });

  it("validates and de-duplicates model candidates against local data", async () => {
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: [
          { rawText: "Mexico 13", code: "MEX 13", confidence: 0.9 },
          { rawText: "Invented", code: "NOPE 99", confidence: 1 },
          { rawText: "MEX13 again", group: "MEX", number: "13", confidence: 0.8 },
        ],
        unresolved: [{ rawText: "sticker 14", reason: "Missing group/team" }],
      },
    });

    const result = await parseStickersFromInput(
      {
        type: "image",
        file: {
          data: new ArrayBuffer(0),
          mimeType: "image/png",
        },
      },
      { providerParser },
    );

    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("configured-model");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.code).toBe("MEX 13");
    expect(result.unresolved).toEqual([
      { rawText: "sticker 14", reason: "Missing group/team" },
    ]);
  });
});

function getGroupCode(sticker: { category: string; countryCode?: string; groupId: string }) {
  if (sticker.category === "fwc") return "FWC";
  if (sticker.category === "cc") return "CC";
  return sticker.countryCode ?? sticker.groupId.toUpperCase();
}

function getStickerCodes(result: ReturnType<typeof parseVoiceTranscriptDeterministically>) {
  return result.candidates.map((candidate) => {
    return `${getGroupCode(candidate.sticker)} ${candidate.sticker.number}`;
  });
}
