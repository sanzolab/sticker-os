import { describe, expect, it } from "vitest";
import {
  getFinalPrimaryConfidenceMinimum,
  shouldUseDeterministicVoiceResult,
} from "./add-stickers-voice-routing";

describe("voice routing helpers", () => {
  it("uses minimum confidence from final primary transcript summary", () => {
    expect(getFinalPrimaryConfidenceMinimum({ minimum: 0.88, segmentCount: 2 })).toBe(0.88);
    expect(getFinalPrimaryConfidenceMinimum({ minimum: 0.55, segmentCount: 0 })).toBe(0);
    expect(getFinalPrimaryConfidenceMinimum({ minimum: Number.NaN, segmentCount: 1 })).toBe(0);
  });

  it("routes to deterministic when candidates exist and parser finds no unresolved tokens", () => {
    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 1,
      needsFallback: false,
    })).toBe(true);

    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 3,
      needsFallback: false,
    })).toBe(true);
  });

  it("routes to fallback when there are zero valid candidates", () => {
    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 0,
      needsFallback: false,
    })).toBe(false);

    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 0,
      needsFallback: true,
    })).toBe(false);
  });

  it("routes to fallback when parser flags unresolved voice tokens", () => {
    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 2,
      needsFallback: true,
    })).toBe(false);

    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 1,
      needsFallback: true,
    })).toBe(false);
  });
});
