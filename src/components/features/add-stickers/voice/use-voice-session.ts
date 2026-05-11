"use client";

import { useRef, useMemo, useCallback } from "react";
import { useAudioHardware } from "./use-audio-hardware";
import { useLocalRecognition } from "./use-local-recognition";
import { useWatchdog } from "./use-watchdog";
import { closeAudioContext } from "./audio-context-singleton";
import { RMS_SAMPLE_MS, MAX_RECORDING_MS } from "./voice-constants";
import type { VoiceState } from "./voice-types";
import type { AddStickersVoiceSubmission } from "../add-stickers-types";

function normalizeRecordedAudioMimeType(value: string) {
  const normalized = value.toLowerCase();
  const container = normalized.split(";")[0]?.trim() ?? normalized;

  if (container.includes("webm")) return "audio/webm";
  if (container.includes("ogg")) return "audio/ogg";
  if (container.includes("mp4") || container.includes("m4a")) return "audio/mp4";
  if (container.includes("mpeg") || container.includes("mp3")) return "audio/mpeg";
  if (container.includes("wav")) return "audio/wav";

  return "audio/webm";
}

function buildRecordedAudioFile(chunks: Blob[], mimeType: string) {
  if (chunks.length === 0) return null;
  const outputMimeType = normalizeRecordedAudioMimeType(mimeType || "audio/webm");
  const blob = new Blob(chunks, { type: outputMimeType });
  if (blob.size === 0) return null;

  const extension = outputMimeType.includes("ogg")
    ? "ogg"
    : outputMimeType.includes("mp4")
      ? "m4a"
      : outputMimeType.includes("mpeg")
        ? "mp3"
        : "webm";

  return new File([blob], `voice-${Date.now()}.${extension}`, { type: outputMimeType });
}

export type VoiceSessionCallbacks = {
  onVoiceStateChange: (state: VoiceState) => void;
  onTranscriptUpdate: (transcript: string) => void;
  onLiveTranscriptUpdate: (transcript: string) => void;
  onBackendOnlyModeChange: (value: boolean) => void;
  onError: (message: string | null) => void;
  onSubmit: (submission: AddStickersVoiceSubmission) => Promise<{
    ok: boolean;
    message?: string;
  }>;
};

export function useVoiceSession() {
  const hardware = useAudioHardware();
  const recognition = useLocalRecognition();
  const watchdog = useWatchdog();

  const sessionRef = useRef<{
    sessionId: string;
    abortController: AbortController;
  } | null>(null);
  const finalizedRef = useRef(false);
  const stopReasonRef = useRef("");
  const cancelledRef = useRef(false);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performAtomicCleanup = useCallback(async (cancel: boolean): Promise<{ chunks: Blob[]; mimeType: string } | null> => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }

    const session = sessionRef.current;
    if (session) {
      session.abortController.abort();
    }

    recognition.stop(cancel);
    const audioResult = await hardware.stop();

    return audioResult;
  }, [hardware, recognition]);

  const finishAndMaybeSubmit = useCallback(
    async (
      sessionId: string,
      reason: string,
      cancel: boolean,
      callbacks: VoiceSessionCallbacks,
    ) => {
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.sessionId !== sessionId) return;
      if (finalizedRef.current) return;

      finalizedRef.current = true;
      stopReasonRef.current = reason;
      cancelledRef.current = cancel;

      const audioResult = await performAtomicCleanup(cancel);

      if (cancel) {
        callbacks.onVoiceStateChange("idle");
        callbacks.onError(null);
        callbacks.onBackendOnlyModeChange(false);
        return;
      }

      if (!sessionRef.current || sessionRef.current.sessionId !== sessionId) return;

      callbacks.onVoiceStateChange("processing");

      const chunks = audioResult?.chunks ?? [];
      const mimeType = audioResult?.mimeType ?? "audio/webm";
      const audioFile = buildRecordedAudioFile(chunks, mimeType);
      const recogState = recognition.getState();
      const isBackendFallback = reason === "no-result-timeout" || watchdog.getIsBackendOnly();

      const submission: AddStickersVoiceSubmission = {
        transcript: recogState.finalTranscript.trim(),
        finalPrimaryConfidence: recogState.finalPrimaryConfidence,
        audioFile,
        stopReason: reason,
        reason: isBackendFallback ? "local-engine-fail" : undefined,
      };

      callbacks.onTranscriptUpdate(submission.transcript);
      callbacks.onBackendOnlyModeChange(false);
      watchdog.setIsBackendOnly(false);

      const result = await callbacks.onSubmit(submission).catch(() => ({
        ok: false,
        message: "",
      }));

      if (!result.ok) {
        callbacks.onVoiceStateChange("transcript");
        callbacks.onError(result.message ?? null);
        return;
      }

      callbacks.onVoiceStateChange("idle");
      callbacks.onError(null);
    },
    [recognition, watchdog, performAtomicCleanup],
  );

  const start = useCallback(
    async (locale: string, callbacks: VoiceSessionCallbacks): Promise<boolean> => {
      const sessionId = crypto.randomUUID();
      const abortController = new AbortController();
      sessionRef.current = { sessionId, abortController };
      finalizedRef.current = false;
      cancelledRef.current = false;
      stopReasonRef.current = "";

      watchdog.reset();
      watchdog.setIsBackendOnly(false);
      callbacks.onBackendOnlyModeChange(false);

      try {
        await hardware.start(abortController.signal);
      } catch {
        await performAtomicCleanup(true);
        callbacks.onVoiceStateChange("idle");
        return false;
      }

      callbacks.onVoiceStateChange("listening");
      callbacks.onError(null);

      recognition.start(locale, sessionId, abortController.signal);
      watchdog.updateResultTime(Date.now());

      maxDurationTimerRef.current = setTimeout(() => {
        if (abortController.signal.aborted) return;
        void finishAndMaybeSubmit(sessionId, "max-duration", false, callbacks);
      }, MAX_RECORDING_MS);

      let lastLiveTranscript = "";

      tickIntervalRef.current = setInterval(() => {
        if (abortController.signal.aborted) return;

        const rms = hardware.getRms();
        const recogState = recognition.getState();

        if (recogState.transcript !== lastLiveTranscript) {
          lastLiveTranscript = recogState.transcript;
          callbacks.onLiveTranscriptUpdate(recogState.transcript);
        }

        const watchdogResult = watchdog.tick(
          abortController.signal,
          rms.isSpeaking,
          recogState.transcript.length > 0,
          recogState.lastResultTime,
        );

        if (!watchdogResult) return;

        if (watchdogResult.shouldEnableBackend && !watchdog.getIsBackendOnly()) {
          watchdog.setIsBackendOnly(true);
          callbacks.onBackendOnlyModeChange(true);
        }

        if (watchdogResult.shouldStop) {
          void finishAndMaybeSubmit(
            sessionId,
            watchdogResult.stopReason,
            false,
            callbacks,
          );
        }
      }, RMS_SAMPLE_MS);

      return true;
    },
    [hardware, recognition, watchdog, performAtomicCleanup, finishAndMaybeSubmit],
  );

  const stop = useCallback(
    (callbacks: VoiceSessionCallbacks) => {
      const session = sessionRef.current;
      if (!session) return;
      void finishAndMaybeSubmit(session.sessionId, "manual-stop", false, callbacks);
    },
    [finishAndMaybeSubmit],
  );

  const cancel = useCallback(
    (callbacks: VoiceSessionCallbacks) => {
      const session = sessionRef.current;
      if (!session) return;
      void finishAndMaybeSubmit(session.sessionId, "manual-cancel", true, callbacks);
    },
    [finishAndMaybeSubmit],
  );

  const cleanup = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    finalizedRef.current = true;
    cancelledRef.current = true;

    await performAtomicCleanup(true);
    sessionRef.current = null;
  }, [performAtomicCleanup]);

  const teardown = useCallback(async () => {
    await cleanup();
    await closeAudioContext();
  }, [cleanup]);

  const getTranscript = useCallback(() => {
    return recognition.getState().transcript;
  }, [recognition]);

  const getFinalTranscript = useCallback(() => {
    return recognition.getState().finalTranscript;
  }, [recognition]);

  const getIsBackendOnly = useCallback(() => {
    return watchdog.getIsBackendOnly();
  }, [watchdog]);

  const getRms = useCallback(() => {
    return hardware.getRms();
  }, [hardware]);

  const getAnalyser = useCallback((): AnalyserNode | null => {
    return hardware.stateRef.current.analyser;
  }, [hardware]);

  const getStopReason = useCallback(() => {
    return stopReasonRef.current;
  }, []);

  return useMemo(
    () => ({
      start,
      stop,
      cancel,
      cleanup,
      teardown,
      getTranscript,
      getFinalTranscript,
      getIsBackendOnly,
      getRms,
      getAnalyser,
      getStopReason,
      hardware,
      recognition,
    }),
    [
      start, stop, cancel, cleanup, teardown,
      getTranscript, getFinalTranscript, getIsBackendOnly,
      getRms, getAnalyser, getStopReason,
      hardware, recognition,
    ],
  );
}
