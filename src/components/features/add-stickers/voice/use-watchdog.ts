"use client";

import { useRef, useMemo, useCallback } from "react";
import {
  SILENCE_STOP_MS,
  NO_RESULT_STOP_MS,
  MAX_RECORDING_MS,
  RMS_SAMPLE_MS,
} from "./voice-constants";

const NO_ACTION = Object.freeze({
  shouldStop: false as const,
  stopReason: "" as const,
  shouldEnableBackend: false as const,
});

const NO_ACTION_BACKEND = Object.freeze({
  shouldStop: false as const,
  stopReason: "" as const,
  shouldEnableBackend: true as const,
});

export type WatchdogState = {
  silenceDuration: number;
  lastResultTime: number;
  recordingDuration: number;
  isBackendOnly: boolean;
};

export function createWatchdogState(): WatchdogState {
  return {
    silenceDuration: 0,
    lastResultTime: 0,
    recordingDuration: 0,
    isBackendOnly: false,
  };
}

export function tickWatchdog(
  state: WatchdogState,
  signal: AbortSignal,
  isSpeaking: boolean,
  hasTranscript: boolean,
  lastRecognitionResultTime: number,
): { shouldStop: boolean; stopReason: string; shouldEnableBackend: boolean } | null {
  if (signal.aborted) return null;

  const nextRecordingDuration = state.recordingDuration + RMS_SAMPLE_MS;

  if (nextRecordingDuration >= MAX_RECORDING_MS) {
    return {
      shouldStop: true,
      stopReason: "max-duration",
      shouldEnableBackend: state.isBackendOnly,
    };
  }

  let nextSilenceDuration = state.silenceDuration;
  if (isSpeaking) {
    nextSilenceDuration = 0;
  } else {
    nextSilenceDuration += RMS_SAMPLE_MS;
  }

  if (nextSilenceDuration >= SILENCE_STOP_MS) {
    return {
      shouldStop: true,
      stopReason: "silence-timeout",
      shouldEnableBackend: state.isBackendOnly,
    };
  }

  const effectiveResultTime = lastRecognitionResultTime > 0
    ? lastRecognitionResultTime
    : state.lastResultTime;

  if (
    isSpeaking &&
    effectiveResultTime > 0 &&
    !hasTranscript
  ) {
    const noResultMs = Date.now() - effectiveResultTime;
    if (noResultMs >= NO_RESULT_STOP_MS) {
      return {
        shouldStop: false,
        stopReason: "",
        shouldEnableBackend: true,
      };
    }
  }

  return state.isBackendOnly ? NO_ACTION_BACKEND : NO_ACTION;
}

export function useWatchdog() {
  const stateRef = useRef<WatchdogState>(createWatchdogState());

  const reset = useCallback(() => {
    stateRef.current = createWatchdogState();
  }, []);

  const tick = useCallback(
    (
      signal: AbortSignal,
      isSpeaking: boolean,
      hasTranscript: boolean,
      lastRecognitionResultTime: number,
    ): { shouldStop: boolean; stopReason: string; shouldEnableBackend: boolean } | null => {
      const result = tickWatchdog(
        stateRef.current,
        signal,
        isSpeaking,
        hasTranscript,
        lastRecognitionResultTime,
      );

      if (result === null) return null;

      if (isSpeaking) {
        stateRef.current.silenceDuration = 0;
      } else {
        stateRef.current.silenceDuration += RMS_SAMPLE_MS;
      }
      stateRef.current.recordingDuration += RMS_SAMPLE_MS;

      if (lastRecognitionResultTime > 0) {
        stateRef.current.lastResultTime = lastRecognitionResultTime;
      }

      if (result.shouldEnableBackend) {
        stateRef.current.isBackendOnly = true;
      }

      return result;
    },
    [],
  );

  const updateResultTime = useCallback((timestamp: number) => {
    stateRef.current.lastResultTime = timestamp;
  }, []);

  const setIsBackendOnly = useCallback((value: boolean) => {
    stateRef.current.isBackendOnly = value;
  }, []);

  const getIsBackendOnly = useCallback(() => stateRef.current.isBackendOnly, []);

  return useMemo(
    () => ({
      reset,
      tick,
      updateResultTime,
      setIsBackendOnly,
      getIsBackendOnly,
    }),
    [reset, tick, updateResultTime, setIsBackendOnly, getIsBackendOnly],
  );
}
