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

  it("routes to deterministic when at least one candidate exists and confidence is high enough", () => {
    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 1,
      needsFallback: false,
      minimumFinalPrimaryConfidence: 0.7,
    })).toBe(true);

    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 2,
      needsFallback: false,
      minimumFinalPrimaryConfidence: 0.69,
    })).toBe(false);
  });

  it("routes to fallback when there are zero valid candidates", () => {
    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 0,
      needsFallback: false,
      minimumFinalPrimaryConfidence: 0.95,
    })).toBe(false);
  });

  it("routes to fallback when final primary confidence is below threshold", () => {
    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 2,
      needsFallback: false,
      minimumFinalPrimaryConfidence: 0.699,
    })).toBe(false);
  });

  it("routes to fallback when parser flags unresolved voice tokens", () => {
    expect(shouldUseDeterministicVoiceResult({
      candidatesCount: 2,
      needsFallback: true,
      minimumFinalPrimaryConfidence: 0.95,
    })).toBe(false);
  });
});
