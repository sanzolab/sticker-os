import { describe, expect, it, vi } from "vitest";
import { sampleRmsSnapshot } from "./use-audio-hardware";
import type { RmsSnapshot } from "./voice-types";

const defaultPrevious: RmsSnapshot = {
  raw: 0,
  smoothed: 0,
  noiseFloor: 0.005,
  adaptiveThreshold: 0.02,
  isSpeaking: false,
};

function makeMockAnalyser(values: number[]): AnalyserNode {
  const buffer = new Float32Array(values);
  return {
    fftSize: buffer.length,
    getFloatTimeDomainData: vi.fn((dest: Float32Array) => {
      for (let i = 0; i < buffer.length; i++) {
        dest[i] = buffer[i];
      }
    }),
  } as unknown as AnalyserNode;
}

describe("sampleRmsSnapshot", () => {
  it("returns previous snapshot when analyser is null", () => {
    const result = sampleRmsSnapshot(null, defaultPrevious, {
      values: [],
      done: false,
    });
    expect(result).toBe(defaultPrevious);
  });

  it("calculates raw RMS from float time domain data", () => {
    const analyser = makeMockAnalyser([0.1, 0.2, 0.1, 0.0]);
    const calibration = { values: [], done: true };
    const result = sampleRmsSnapshot(analyser, defaultPrevious, calibration);

    const expected = Math.sqrt((0.1 * 0.1 + 0.2 * 0.2 + 0.1 * 0.1 + 0.0 * 0.0) / 4);
    expect(result.raw).toBeCloseTo(expected, 5);
  });

  it("calibrates noise floor from first samples", () => {
    const analyser = makeMockAnalyser([0.001, 0.002, 0.0015]);
    const calibration = { values: [], done: false };
    const result = sampleRmsSnapshot(analyser, defaultPrevious, calibration);

    expect(calibration.values.length).toBe(1);
    expect(result.noiseFloor).toBeGreaterThanOrEqual(0.005);
  });

  it("uses adaptive threshold after calibration", () => {
    const analyser = makeMockAnalyser([0.1, 0.15, 0.1, 0.05]);
    const calibration = { values: [0.01, 0.015, 0.012, 0.018, 0.011, 0.014], done: true };
    const previous: RmsSnapshot = {
      ...defaultPrevious,
      noiseFloor: 0.01,
    };

    const result = sampleRmsSnapshot(analyser, previous, calibration);
    const expectedThreshold = Math.max(0.01 * 2.5, 0.02);
    expect(result.adaptiveThreshold).toBe(expectedThreshold);
  });

  it("detects speaking when RMS exceeds adaptive threshold", () => {
    const analyser = makeMockAnalyser([0.3, 0.3, 0.3, 0.3]);
    const calibration = { values: [], done: true };
    const previous: RmsSnapshot = {
      raw: 0.3,
      smoothed: 0.3,
      noiseFloor: 0.01,
      adaptiveThreshold: Math.max(0.01 * 2.5, 0.02),
      isSpeaking: false,
    };

    const result = sampleRmsSnapshot(analyser, previous, calibration);
    expect(result.isSpeaking).toBe(true);
  });

  it("detects non-speaking when RMS is below threshold", () => {
    const analyser = makeMockAnalyser([0.001, 0.002, 0.001, 0.001]);
    const calibration = { values: [], done: true };
    const previous: RmsSnapshot = {
      raw: 0.001,
      smoothed: 0.001,
      noiseFloor: 0.005,
      adaptiveThreshold: Math.max(0.005 * 2.5, 0.02),
      isSpeaking: false,
    };

    const result = sampleRmsSnapshot(analyser, previous, calibration);
    expect(result.isSpeaking).toBe(false);
  });

  it("applies smoothing to RMS values", () => {
    const analyser = makeMockAnalyser([0.5, 0.5, 0.5, 0.5]);
    const calibration = { values: [], done: true };
    const previous: RmsSnapshot = {
      raw: 0.1,
      smoothed: 0.1,
      noiseFloor: 0.005,
      adaptiveThreshold: 0.02,
      isSpeaking: false,
    };

    const result = sampleRmsSnapshot(analyser, previous, calibration);
    // smoothed = 0.3 * raw + 0.7 * previous.smoothed
    const expectedRaw = Math.sqrt((0.5 * 0.5 * 4) / 4); // = 0.5
    const expectedSmoothed = 0.3 * expectedRaw + 0.7 * 0.1;
    expect(result.smoothed).toBeCloseTo(expectedSmoothed, 5);
  });

  it("enforces minimum adaptive threshold of 0.02", () => {
    const analyser = makeMockAnalyser([0.001, 0.001]);
    const calibration = { values: [0.001, 0.001, 0.001], done: true };
    const previous: RmsSnapshot = {
      ...defaultPrevious,
      noiseFloor: 0.001,
    };

    const result = sampleRmsSnapshot(analyser, previous, calibration);
    expect(result.adaptiveThreshold).toBe(0.02);
  });

  it("reuses pre-allocated buffer when provided", () => {
    const values = [0.2, 0.3, 0.2, 0.1];
    const analyser = makeMockAnalyser(values);
    const calibration = { values: [], done: true };
    const preAllocated = new Float32Array(analyser.fftSize);

    const result = sampleRmsSnapshot(analyser, defaultPrevious, calibration, preAllocated);

    expect(analyser.getFloatTimeDomainData).toHaveBeenCalledTimes(1);
    expect(analyser.getFloatTimeDomainData).toHaveBeenCalledWith(preAllocated);
    expect(preAllocated[0]).toBeCloseTo(0.2, 5);
    expect(result.raw).toBeCloseTo(
      Math.sqrt((0.2 * 0.2 + 0.3 * 0.3 + 0.2 * 0.2 + 0.1 * 0.1) / 4),
      5,
    );
  });

  it("allocates new buffer when none is provided (backward compat)", () => {
    const values = [0.2, 0.3, 0.2, 0.1];
    const analyser = makeMockAnalyser(values);
    const calibration = { values: [], done: true };

    const result = sampleRmsSnapshot(analyser, defaultPrevious, calibration);

    expect(analyser.getFloatTimeDomainData).toHaveBeenCalledTimes(1);
    expect(result.raw).toBeCloseTo(
      Math.sqrt((0.2 * 0.2 + 0.3 * 0.3 + 0.2 * 0.2 + 0.1 * 0.1) / 4),
      5,
    );
  });

  it("handles null buffer by allocating a new one", () => {
    const values = [0.1, 0.1];
    const analyser = makeMockAnalyser(values);
    const calibration = { values: [], done: true };

    const result = sampleRmsSnapshot(analyser, defaultPrevious, calibration, null);

    expect(analyser.getFloatTimeDomainData).toHaveBeenCalledTimes(1);
    expect(result.raw).toBeCloseTo(Math.sqrt((0.1 * 0.1 + 0.1 * 0.1) / 2), 5);
  });
});
