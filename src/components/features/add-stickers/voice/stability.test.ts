import { describe, expect, it, vi } from "vitest";
import {
  createWatchdogState,
  tickWatchdog,
  type WatchdogState,
} from "./use-watchdog";
import { sampleRmsSnapshot } from "./use-audio-hardware";
import {
  RMS_SAMPLE_MS,
  SILENCE_STOP_MS,
  MAX_RECORDING_MS,
} from "./voice-constants";
import type { RmsSnapshot } from "./voice-types";

function createMockSignal(aborted = false): AbortSignal {
  return { aborted } as AbortSignal;
}

function makeMockAnalyserWithValues(values: number[]): AnalyserNode {
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

const defaultRms: RmsSnapshot = {
  raw: 0,
  smoothed: 0,
  noiseFloor: 0.005,
  adaptiveThreshold: 0.02,
  isSpeaking: false,
};

// ---------------------------------------------------------------------------
// AbortController cancellation safety
// ---------------------------------------------------------------------------

describe("stale session callback rejection (abort safety)", () => {
  it("tickWatchdog returns null when signal is already aborted", () => {
    const state = createWatchdogState();
    const signal = createMockSignal(true);
    expect(tickWatchdog(state, signal, true, true, Date.now())).toBeNull();
  });

  it("tickWatchdog returns null when signal aborted in-flight", () => {
    // Simulates calling tickWatchdog with an AbortSignal that was aborted
    // by a new session's start — the old session's callbacks must not execute.
    const state = createWatchdogState();
    const signal = { aborted: true } as AbortSignal;
    expect(tickWatchdog(state, signal, true, false, Date.now())).toBeNull();
  });

  it("non-aborted signal allows normal execution", () => {
    const state = createWatchdogState();
    const signal = createMockSignal(false);
    const result = tickWatchdog(state, signal, false, false, 0);
    expect(result).not.toBeNull();
  });

  it("silence detection is skipped when signal aborted", () => {
    const state: WatchdogState = {
      silenceDuration: SILENCE_STOP_MS + RMS_SAMPLE_MS,
      recordingDuration: 0,
      lastResultTime: 0,
      isBackendOnly: false,
    };
    const result = tickWatchdog(state, createMockSignal(true), false, false, 0);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Watchdog cleanup integrity
// ---------------------------------------------------------------------------

describe("watchdog cleanup integrity", () => {
  it("createWatchdogState always produces fresh clean state", () => {
    const s1 = createWatchdogState();
    s1.silenceDuration = 999;
    const s2 = createWatchdogState();
    expect(s2.silenceDuration).toBe(0);
    expect(s2.recordingDuration).toBe(0);
    expect(s2.isBackendOnly).toBe(false);
    expect(s1).not.toBe(s2);
  });

  it("reset via createWatchdogState clears backend-only flag", () => {
    const dirty: WatchdogState = {
      silenceDuration: 1000,
      recordingDuration: 5000,
      lastResultTime: Date.now(),
      isBackendOnly: true,
    };
    expect(dirty.isBackendOnly).toBe(true);
    const clean = createWatchdogState();
    expect(clean.isBackendOnly).toBe(false);
    expect(clean.silenceDuration).toBe(0);
  });

  it("max-duration stop takes priority over silence timeout", () => {
    const state: WatchdogState = {
      silenceDuration: SILENCE_STOP_MS + RMS_SAMPLE_MS,
      recordingDuration: MAX_RECORDING_MS - RMS_SAMPLE_MS,
      lastResultTime: 0,
      isBackendOnly: false,
    };
    const result = tickWatchdog(state, createMockSignal(), false, false, 0);
    expect(result?.shouldStop).toBe(true);
    expect(result?.stopReason).toBe("max-duration");
  });
});

// ---------------------------------------------------------------------------
// RMS smoothing stability
// ---------------------------------------------------------------------------

describe("RMS smoothing stability", () => {
  it("converges to steady state after many silent samples", () => {
    const analyser = makeMockAnalyserWithValues([0.001, 0.001, 0.001, 0.001]);
    const calibration = { values: [0.001, 0.001, 0.001, 0.001, 0.001, 0.001], done: true };

    let current: RmsSnapshot = { ...defaultRms, noiseFloor: 0.005 };

    for (let i = 0; i < 20; i++) {
      current = sampleRmsSnapshot(analyser, current, calibration);
    }

    expect(current.smoothed).toBeLessThan(0.01);
    expect(current.isSpeaking).toBe(false);
  });

  it("responds quickly to sudden loud signal", () => {
    const analyser = makeMockAnalyserWithValues([0.5, 0.5, 0.5, 0.5]);
    const calibration = { values: [], done: true };

    const result = sampleRmsSnapshot(analyser, defaultRms, calibration);

    expect(result.raw).toBeCloseTo(0.5, 3);
    expect(result.smoothed).toBeGreaterThan(0.1);
    expect(result.isSpeaking).toBe(true);
  });

  it("buffer pooling does not affect RMS values", () => {
    const values = [0.2, 0.3, 0.2, 0.1];
    const analyser1 = makeMockAnalyserWithValues(values);
    const analyser2 = makeMockAnalyserWithValues(values);
    const calibration = { values: [], done: true };
    const pooled = new Float32Array(analyser1.fftSize);

    const withBuffer = sampleRmsSnapshot(analyser1, defaultRms, calibration, pooled);
    const withoutBuffer = sampleRmsSnapshot(analyser2, defaultRms, calibration);

    expect(withBuffer.raw).toBeCloseTo(withoutBuffer.raw, 5);
    expect(withBuffer.smoothed).toBeCloseTo(withoutBuffer.smoothed, 5);
  });
});
