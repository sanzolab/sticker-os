import { describe, expect, it } from "vitest";
import {
  SILENCE_STOP_MS,
  NO_RESULT_STOP_MS,
  RMS_SAMPLE_MS,
  MIN_ADAPTIVE_THRESHOLD,
  NOISE_FLOOR_MULTIPLIER,
  RMS_SMOOTHING_ALPHA,
} from "./voice-constants";

describe("voice-constants", () => {
  it("has correct timing values", () => {
    expect(SILENCE_STOP_MS).toBe(1500);
    expect(NO_RESULT_STOP_MS).toBe(1200);
    expect(RMS_SAMPLE_MS).toBe(50);
  });

  it("has adaptive threshold constants", () => {
    expect(MIN_ADAPTIVE_THRESHOLD).toBe(0.02);
    expect(NOISE_FLOOR_MULTIPLIER).toBe(2.5);
    expect(RMS_SMOOTHING_ALPHA).toBe(0.3);
  });
});
