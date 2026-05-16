import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import {
  parseStickersFromInput,
  parseTextDeterministically,
} from "@/lib/ai/parse-stickers";
import { parseVoiceTranscriptDeterministically } from "@/lib/ai/deterministic";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

    expect(providerParser).toHaveBeenCalledWith(
      {
        type: "text",
        source: "voice-transcript",
        text: "sticker 14",
      },
      expect.objectContaining({ signal: expect.any(Object) }),
    );
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
      {
        rawText: "Invented",
        reason: "Weak visual signal without readable sticker code/text.",
      },
    ]);
  });

  it("downgrades medium evidence when image coverage is suspiciously high", async () => {
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: Array.from({ length: 12 }, (_, index) => {
          const number = `${index + 1}`;
          return {
            rawText: `Coca Cola sticker ${number}`,
            group: "CC",
            number,
            confidence: 0.95,
          };
        }),
        unresolved: [],
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

    expect(result.candidates).toHaveLength(12);
    expect(result.candidates.some((candidate) => candidate.confidence <= 0.55)).toBe(true);
  });

  it("keeps strong printed-code evidence while downgrading medium evidence on suspicious grids", async () => {
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: Array.from({ length: 12 }, (_, index) => {
          const number = `${index + 1}`;
          return {
            rawText: number === "5" ? "CC 5" : `Coca Cola sticker ${number}`,
            group: "CC",
            number,
            confidence: 0.95,
          };
        }),
        unresolved: [],
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

    const strong = result.candidates.find((candidate) => candidate.code === "CC 5");
    expect(strong).toBeDefined();
    expect(strong!.confidence).toBe(0.95);

    const downgraded = result.candidates
      .filter((candidate) => candidate.code !== "CC 5")
      .map((candidate) => candidate.confidence);
    expect(downgraded.length).toBe(11);
    expect(downgraded.every((confidence) => confidence <= 0.55)).toBe(true);
  });

  it("treats sparse group coverage below fifty percent as likely real", async () => {
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: ["3", "7", "12", "18"].map((number) => ({
          rawText: `Mexico sticker ${number}`,
          group: "MEX",
          number,
          confidence: 0.9,
        })),
        unresolved: [],
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

    expect(result.candidates.map((candidate) => candidate.code)).toEqual([
      "MEX 3",
      "MEX 7",
      "MEX 12",
      "MEX 18",
    ]);
    expect(result.candidates.every((candidate) => candidate.confidence > 0.55)).toBe(true);
  });

  it("moves artwork-only detections to unresolved for image input", async () => {
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: [
          {
            rawText: "player portrait",
            group: "MEX",
            number: "5",
            confidence: 0.9,
            visualEvidence: "artwork",
          },
          {
            rawText: "MEX 13",
            code: "MEX 13",
            confidence: 0.9,
          },
        ],
        unresolved: [],
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

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.code).toBe("MEX 13");
    expect(result.unresolved).toEqual([
      {
        rawText: "player portrait",
        reason: "Weak visual signal without readable sticker code/text.",
      },
    ]);
  });

  it("ignores blank placeholder slot outputs for image input", async () => {
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: [
          {
            rawText: "blank placeholder slot",
            group: "MEX",
            number: "8",
            confidence: 0.99,
            visualEvidence: "empty",
          },
          {
            rawText: "MEX 8",
            code: "MEX 8",
            confidence: 0.9,
          },
        ],
        unresolved: [],
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

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.code).toBe("MEX 8");
    expect(result.unresolved).toEqual([]);
  });

  it("returns distinguishable empty metadata when image slots are all placeholders", async () => {
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: [
          {
            rawText: "blank placeholder slot",
            group: "MEX",
            number: "8",
            confidence: 0.99,
            visualEvidence: "empty",
          },
        ],
        unresolved: [],
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

    expect(result.candidates).toEqual([]);
    expect(result.unresolved).toEqual([]);
    expect(result.meta).toEqual({ status: "empty" });
  });

  it("times out provider calls instead of leaving image parsing pending", async () => {
    vi.useFakeTimers();
    const providerParser = vi.fn(
      () =>
        new Promise<never>(() => {
          // Simulates a provider fetch that never settles.
        }),
    );

    const resultPromise = parseStickersFromInput(
      {
        type: "image",
        file: {
          data: new ArrayBuffer(0),
          mimeType: "image/png",
        },
      },
      { providerParser },
    );

    const assertion = expect(resultPromise).rejects.toMatchObject({
      code: "AI_TIMEOUT_ERROR",
      status: 504,
    });
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
    expect(providerParser).toHaveBeenCalledTimes(1);
  });

  it("resizes and recompresses image uploads before model parsing", async () => {
    const largePng = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    }).png().toBuffer();
    const providerParser = vi.fn().mockImplementation(async (input) => {
      if (input.type !== "image") {
        throw new Error("Expected image input.");
      }

      const metadata = await sharp(Buffer.from(input.file.data)).metadata();
      expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(1600);
      expect(metadata.format).toBe("jpeg");
      expect(input.file.mimeType).toBe("image/jpeg");
      expect(hashArrayBuffer(input.file.data)).not.toBe(hashBuffer(largePng));

      return {
        provider: "gemini",
        model: "configured-model",
        result: {
          stickers: [],
          unresolved: [],
        },
      };
    });

    await parseStickersFromInput(
      {
        type: "image",
        file: {
          data: (() => {
            const arrayBuffer = new ArrayBuffer(largePng.byteLength);
            new Uint8Array(arrayBuffer).set(largePng);
            return arrayBuffer;
          })(),
          mimeType: "image/png",
        },
      },
      { providerParser },
    );

    expect(providerParser).toHaveBeenCalledTimes(1);
  });

  it("caps portrait uploads by longest side before model parsing", async () => {
    const portraitPng = await sharp({
      create: {
        width: 900,
        height: 2400,
        channels: 3,
        background: { r: 230, g: 230, b: 230 },
      },
    }).png().toBuffer();
    const providerParser = vi.fn().mockImplementation(async (input) => {
      if (input.type !== "image") {
        throw new Error("Expected image input.");
      }

      const metadata = await sharp(Buffer.from(input.file.data)).metadata();
      expect(metadata.format).toBe("jpeg");
      expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBe(1600);
      expect(metadata.width).toBeLessThanOrEqual(1600);
      expect(metadata.height).toBeLessThanOrEqual(1600);

      return {
        provider: "gemini",
        model: "configured-model",
        result: {
          stickers: [],
          unresolved: [],
        },
      };
    });

    await parseStickersFromInput(
      {
        type: "image",
        file: {
          data: toArrayBuffer(portraitPng),
          mimeType: "image/png",
        },
      },
      { providerParser },
    );

    expect(providerParser).toHaveBeenCalledTimes(1);
  });

  it("logs privacy-safe image diagnostics for original and provider-input hashes", async () => {
    const diagnosticsSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const inputPng = await sharp({
      create: {
        width: 1800,
        height: 1200,
        channels: 3,
        background: { r: 250, g: 250, b: 250 },
      },
    }).png().toBuffer();
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: [],
        unresolved: [],
      },
    });

    await parseStickersFromInput(
      {
        type: "image",
        file: {
          data: toArrayBuffer(inputPng),
          mimeType: "image/png",
        },
      },
      { providerParser },
    );

    const diagnosticCalls = diagnosticsSpy.mock.calls.filter((call) =>
      call[0] === "[ai.parse] image diagnostics"
    );
    expect(diagnosticCalls).toHaveLength(2);

    const original = diagnosticCalls.find((call) => call[1]?.stage === "original")?.[1];
    const providerInput = diagnosticCalls.find((call) => call[1]?.stage === "provider-input")?.[1];

    expect(original).toMatchObject({
      stage: "original",
      mimeType: "image/png",
      hashSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(providerInput).toMatchObject({
      stage: "provider-input",
      mimeType: "image/jpeg",
      hashSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(providerInput?.hashSha256).not.toBe(original?.hashSha256);
    expect(original).not.toHaveProperty("imageBase64");
    expect(original).not.toHaveProperty("data");
    expect(original).not.toHaveProperty("url");
    expect(providerInput).not.toHaveProperty("imageBase64");
    expect(providerInput).not.toHaveProperty("data");
    expect(providerInput).not.toHaveProperty("url");
  });

  it("applies deterministic light sharpening and mild contrast before model parsing", () => {
    const source = readFileSync(new URL("./parse-stickers.ts", import.meta.url), "utf8");
    expect(source).toContain(".sharpen(");
    expect(source).toContain(".linear(");
    expect(source).toContain("getNumberEnv(\"AI_IMAGE_QUALITY\", 90)");
  });

  it("uses OpenAI fallback after a fast non-timeout Gemini failure", async () => {
    const originalDefaults = {
      AI_DEFAULT_PROVIDER: process.env.AI_DEFAULT_PROVIDER,
      AI_ENABLE_FALLBACKS: process.env.AI_ENABLE_FALLBACKS,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
    };

    try {
      process.env.AI_DEFAULT_PROVIDER = "gemini";
      process.env.AI_ENABLE_FALLBACKS = "true";
      process.env.GEMINI_API_KEY = "gemini-key";
      process.env.GEMINI_MODEL = "gemini-model";
      process.env.OPENAI_API_KEY = "openai-key";
      process.env.OPENAI_MODEL = "openai-model";

      vi.resetModules();
      const parseGemini = vi.fn().mockRejectedValue(
        new Error("upstream fast failure"),
      );
      const parseOpenAi = vi.fn().mockResolvedValue({
        provider: "openai",
        model: "openai-model",
        result: {
          stickers: [],
          unresolved: [],
        },
      });

      vi.doMock("@/lib/ai/providers/gemini", () => ({
        parseStickersWithGemini: parseGemini,
      }));
      vi.doMock("@/lib/ai/providers/openai", () => ({
        parseStickersWithOpenAi: parseOpenAi,
      }));

      const { parseStickersFromInput: parseWithFallback } = await import("@/lib/ai/parse-stickers");

      const result = await parseWithFallback({
        type: "audio",
        file: {
          data: new ArrayBuffer(0),
          mimeType: "audio/webm",
        },
      });

      expect(parseGemini).toHaveBeenCalledTimes(1);
      expect(parseOpenAi).toHaveBeenCalledTimes(1);
      expect(result.provider).toBe("openai");
    } finally {
      vi.doUnmock("@/lib/ai/providers/gemini");
      vi.doUnmock("@/lib/ai/providers/openai");
      process.env.AI_DEFAULT_PROVIDER = originalDefaults.AI_DEFAULT_PROVIDER;
      process.env.AI_ENABLE_FALLBACKS = originalDefaults.AI_ENABLE_FALLBACKS;
      process.env.OPENAI_API_KEY = originalDefaults.OPENAI_API_KEY;
      process.env.OPENAI_MODEL = originalDefaults.OPENAI_MODEL;
      process.env.GEMINI_API_KEY = originalDefaults.GEMINI_API_KEY;
      process.env.GEMINI_MODEL = originalDefaults.GEMINI_MODEL;
    }
  });

  it("does not fallback after a slow Gemini failure", async () => {
    const originalDefaults = {
      AI_DEFAULT_PROVIDER: process.env.AI_DEFAULT_PROVIDER,
      AI_ENABLE_FALLBACKS: process.env.AI_ENABLE_FALLBACKS,
      AI_FAST_FAIL_FALLBACK_MS: process.env.AI_FAST_FAIL_FALLBACK_MS,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
    };

    try {
      process.env.AI_DEFAULT_PROVIDER = "gemini";
      process.env.AI_ENABLE_FALLBACKS = "true";
      process.env.AI_FAST_FAIL_FALLBACK_MS = "3000";
      process.env.GEMINI_API_KEY = "gemini-key";
      process.env.GEMINI_MODEL = "gemini-model";
      process.env.OPENAI_API_KEY = "openai-key";
      process.env.OPENAI_MODEL = "openai-model";

      vi.useFakeTimers();
      vi.resetModules();
      const parseGemini = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3100));
        throw new Error("slow failure");
      });
      const parseOpenAi = vi.fn();

      vi.doMock("@/lib/ai/providers/gemini", () => ({
        parseStickersWithGemini: parseGemini,
      }));
      vi.doMock("@/lib/ai/providers/openai", () => ({
        parseStickersWithOpenAi: parseOpenAi,
      }));

      const { parseStickersFromInput: parseWithFallback } = await import("@/lib/ai/parse-stickers");
      const promise = parseWithFallback({
        type: "audio",
        file: {
          data: new ArrayBuffer(0),
          mimeType: "audio/webm",
        },
      });
      const assertion = expect(promise).rejects.toThrow("slow failure");
      await vi.advanceTimersByTimeAsync(4000);
      await assertion;
      expect(parseGemini).toHaveBeenCalledTimes(1);
      expect(parseOpenAi).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("@/lib/ai/providers/gemini");
      vi.doUnmock("@/lib/ai/providers/openai");
      process.env.AI_DEFAULT_PROVIDER = originalDefaults.AI_DEFAULT_PROVIDER;
      process.env.AI_ENABLE_FALLBACKS = originalDefaults.AI_ENABLE_FALLBACKS;
      process.env.AI_FAST_FAIL_FALLBACK_MS = originalDefaults.AI_FAST_FAIL_FALLBACK_MS;
      process.env.OPENAI_API_KEY = originalDefaults.OPENAI_API_KEY;
      process.env.OPENAI_MODEL = originalDefaults.OPENAI_MODEL;
      process.env.GEMINI_API_KEY = originalDefaults.GEMINI_API_KEY;
      process.env.GEMINI_MODEL = originalDefaults.GEMINI_MODEL;
    }
  });

  it("logs normalization failures and returns error metadata for image input", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const providerParser = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "configured-model",
      result: {
        stickers: [],
        unresolved: undefined,
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

    expect(consoleError).toHaveBeenCalledWith(
      "normalizeModelResult failed",
      expect.any(TypeError),
    );
    expect(result.candidates).toEqual([]);
    expect(result.unresolved).toEqual([]);
    expect(result.meta).toEqual({
      status: "error",
      errorCode: "AI_PROVIDER_ERROR",
    });
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

function toArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

function hashBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function hashArrayBuffer(value: ArrayBuffer) {
  return hashBuffer(Buffer.from(value));
}
