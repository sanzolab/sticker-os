import { describe, expect, it } from "vitest";
import {
  createWatchdogState,
  tickWatchdog,
  type WatchdogState,
} from "./use-watchdog";
import { RMS_SAMPLE_MS, SILENCE_STOP_MS } from "./voice-constants";

const TICKS_FOR_SILENCE = Math.ceil(SILENCE_STOP_MS / RMS_SAMPLE_MS);

function createMockSignal(aborted = false): AbortSignal {
  return { aborted } as AbortSignal;
}

describe("createWatchdogState", () => {
  it("returns initial state with all zero values", () => {
    const state = createWatchdogState();
    expect(state.silenceDuration).toBe(0);
    expect(state.recordingDuration).toBe(0);
    expect(state.lastResultTime).toBe(0);
    expect(state.isBackendOnly).toBe(false);
  });
});

describe("tickWatchdog", () => {
  it("returns null when signal is aborted", () => {
    const state = createWatchdogState();
    const signal = createMockSignal(true);
    const result = tickWatchdog(state, signal, false, false, 0);
    expect(result).toBeNull();
  });

  it("detects silence timeout after enough ticks", () => {
    const state = createWatchdogState();

    let currentState = state;
    for (let i = 0; i < TICKS_FOR_SILENCE; i++) {
      currentState = {
        ...currentState,
        silenceDuration: i * RMS_SAMPLE_MS,
        recordingDuration: i * RMS_SAMPLE_MS,
      };
      const result = tickWatchdog(currentState, createMockSignal(), false, false, 0);
      if (result && result.shouldStop) {
        expect(result.stopReason).toBe("silence-timeout");
        return;
      }
    }
    const finalState = {
      ...currentState,
      silenceDuration: TICKS_FOR_SILENCE * RMS_SAMPLE_MS,
      recordingDuration: TICKS_FOR_SILENCE * RMS_SAMPLE_MS,
    };
    const final = tickWatchdog(finalState, createMockSignal(), false, false, 0);
    expect(final?.shouldStop).toBe(true);
    expect(final?.stopReason).toBe("silence-timeout");
  });

  it("resets silence when speaking is detected", () => {
    const state = createWatchdogState();
    const result = tickWatchdog(state, createMockSignal(), true, false, 0);
    // After one tick of speaking, next state would have silenceDuration = 0
    expect(result).not.toBeNull();
    if (result) {
      expect(result.shouldStop).toBe(false);
    }
  });

  it("detects speech with no transcript and enables backend-only", () => {
    const state: WatchdogState = {
      silenceDuration: 0,
      recordingDuration: 0,
      lastResultTime: Date.now() - 1500,
      isBackendOnly: false,
    };
    const result = tickWatchdog(state, createMockSignal(), true, false, 0);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.shouldEnableBackend).toBe(true);
      expect(result.shouldStop).toBe(false);
    }
  });

  it("does NOT enable backend-only when transcript is available", () => {
    const state: WatchdogState = {
      silenceDuration: 0,
      recordingDuration: 0,
      lastResultTime: Date.now() - 1500,
      isBackendOnly: false,
    };
    const result = tickWatchdog(state, createMockSignal(), true, true, 0);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.shouldEnableBackend).toBe(false);
      expect(result.shouldStop).toBe(false);
    }
  });

  it("detects max duration", () => {
    const state: WatchdogState = {
      silenceDuration: 0,
      recordingDuration: 15000 - RMS_SAMPLE_MS,
      lastResultTime: 0,
      isBackendOnly: false,
    };
    const result = tickWatchdog(state, createMockSignal(), true, true, 0);
    expect(result?.shouldStop).toBe(true);
    expect(result?.stopReason).toBe("max-duration");
  });

  it("retains existing isBackendOnly flag", () => {
    const state: WatchdogState = {
      silenceDuration: 0,
      recordingDuration: 0,
      lastResultTime: 0,
      isBackendOnly: true,
    };
    const result = tickWatchdog(state, createMockSignal(), true, true, 0);
    expect(result?.shouldEnableBackend).toBe(true);
  });
});
