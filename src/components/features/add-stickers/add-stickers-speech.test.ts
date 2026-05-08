import { describe, expect, it } from "vitest";
import {
  collectRawSpeechAlternatives,
  collectSpeechTranscriptViews,
  getSpeechRecognitionLanguage,
  getSpeechRecognitionLanguageHint,
  shouldRestartSpeechRecognition,
} from "./add-stickers-speech";

describe("speech recognition language hints", () => {
  it("uses Spanish browser language variants when available", () => {
    expect(getSpeechRecognitionLanguageHint(["fr-FR", "es-CO"])).toBe("es-CO");
    expect(getSpeechRecognitionLanguageHint(["es-MX"])).toBe("es-MX");
  });

  it("uses English browser language variants when available", () => {
    expect(getSpeechRecognitionLanguageHint(["de-DE", "en-GB"])).toBe("en-GB");
    expect(getSpeechRecognitionLanguageHint(["en-US"])).toBe("en-US");
  });

  it("expands base Spanish and English language tags", () => {
    expect(getSpeechRecognitionLanguageHint(["es"])).toBe("es-ES");
    expect(getSpeechRecognitionLanguageHint(["en"])).toBe("en-US");
  });

  it("returns undefined for unsupported browser language hints", () => {
    expect(getSpeechRecognitionLanguageHint(["fr-FR", "pt-BR"])).toBeUndefined();
    expect(getSpeechRecognitionLanguageHint([])).toBeUndefined();
  });

  it("falls back to the app locale when browser languages are unsupported", () => {
    expect(getSpeechRecognitionLanguage("es", ["fr-FR", "pt-BR"])).toBe("es-CO");
    expect(getSpeechRecognitionLanguage("en", ["fr-FR", "pt-BR"])).toBe("en-US");
  });

  it("prefers supported browser languages before app locale defaults", () => {
    expect(getSpeechRecognitionLanguage("es", ["en-GB"])).toBe("en-GB");
    expect(getSpeechRecognitionLanguage("en", ["es-MX"])).toBe("es-MX");
  });
});

describe("raw speech alternatives", () => {
  it("extracts transcript alternatives with result metadata", () => {
    const event = {
      resultIndex: 0,
      results: [
        speechResult(false, [
          ["Colombia catorce", 0.81],
          ["Colombia 14", 0.62],
        ]),
        speechResult(true, [["Mexico 18", 0.93]]),
      ],
    } as unknown as SpeechRecognitionEvent;

    expect(collectRawSpeechAlternatives(event)).toEqual([
      {
        transcript: "Colombia catorce",
        confidence: 0.81,
        isFinal: false,
        resultIndex: 0,
        alternativeIndex: 0,
      },
      {
        transcript: "Colombia 14",
        confidence: 0.62,
        isFinal: false,
        resultIndex: 0,
        alternativeIndex: 1,
      },
      {
        transcript: "Mexico 18",
        confidence: 0.93,
        isFinal: true,
        resultIndex: 1,
        alternativeIndex: 0,
      },
    ]);
  });

  it("builds live and final transcript views from primary alternatives only", () => {
    const event = {
      resultIndex: 0,
      results: [
        speechResult(true, [
          ["colombia 11", 0.9],
          ["colombia once", 0.3],
        ]),
        speechResult(false, [
          ["mexico 5", 0.4],
          ["mexico cinco", 0.8],
        ]),
        speechResult(true, [
          ["cc 14", 0.72],
          ["ce ce catorce", 0.95],
        ]),
      ],
    } as unknown as SpeechRecognitionEvent;

    const views = collectSpeechTranscriptViews(event);
    expect(views.finalTranscript).toBe("colombia 11 cc 14");
    expect(views.liveTranscript).toBe("colombia 11 cc 14 mexico 5");
  });

  it("aggregates confidence as the minimum across final primary segments", () => {
    const event = {
      resultIndex: 0,
      results: [
        speechResult(true, [["colombia 11", 0.91]]),
        speechResult(false, [["mexico 5", 0.33]]),
        speechResult(true, [["cc 14", 0.72]]),
      ],
    } as unknown as SpeechRecognitionEvent;

    expect(collectSpeechTranscriptViews(event).finalPrimaryConfidence).toEqual({
      minimum: 0.72,
      segmentCount: 2,
    });
  });
});

describe("speech recognition restart decisions", () => {
  it("restarts silent or no-speech endings while attempts remain", () => {
    expect(shouldRestartSpeechRecognition({
      error: null,
      hasTranscript: false,
      manuallyStopped: false,
      restartCount: 0,
      maxRestarts: 3,
    })).toBe(true);

    expect(shouldRestartSpeechRecognition({
      error: "no-speech",
      hasTranscript: false,
      manuallyStopped: false,
      restartCount: 2,
      maxRestarts: 3,
    })).toBe(true);
  });

  it("does not restart fatal errors, manual stops, transcripts, or exhausted attempts", () => {
    expect(shouldRestartSpeechRecognition({
      error: "not-allowed",
      hasTranscript: false,
      manuallyStopped: false,
      restartCount: 0,
      maxRestarts: 3,
    })).toBe(false);

    expect(shouldRestartSpeechRecognition({
      error: "service-not-allowed",
      hasTranscript: false,
      manuallyStopped: false,
      restartCount: 0,
      maxRestarts: 3,
    })).toBe(false);

    expect(shouldRestartSpeechRecognition({
      error: "audio-capture",
      hasTranscript: false,
      manuallyStopped: false,
      restartCount: 0,
      maxRestarts: 3,
    })).toBe(false);

    expect(shouldRestartSpeechRecognition({
      error: "no-speech",
      hasTranscript: false,
      manuallyStopped: true,
      restartCount: 0,
      maxRestarts: 3,
    })).toBe(false);

    expect(shouldRestartSpeechRecognition({
      error: "no-speech",
      hasTranscript: true,
      manuallyStopped: false,
      restartCount: 0,
      maxRestarts: 3,
    })).toBe(false);

    expect(shouldRestartSpeechRecognition({
      error: "no-speech",
      hasTranscript: false,
      manuallyStopped: false,
      restartCount: 3,
      maxRestarts: 3,
    })).toBe(false);
  });
});

function speechResult(
  isFinal: boolean,
  alternatives: Array<[string, number]>,
): SpeechRecognitionResult {
  return {
    isFinal,
    length: alternatives.length,
    item(index: number) {
      return this[index];
    },
    ...Object.fromEntries(
      alternatives.map(([transcript, confidence], index) => [
        index,
        { transcript, confidence },
      ]),
    ),
  } as SpeechRecognitionResult;
}
