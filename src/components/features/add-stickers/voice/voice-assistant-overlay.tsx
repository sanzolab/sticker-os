"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAssistantStore } from "@/lib/assistant-store";
import { useStickerStore } from "@/lib/store";
import { analyzeVoiceSubmission } from "@/lib/voice-submit";
import { useVoiceSession } from "./use-voice-session";
import { VoiceCanvasVisualizer } from "./voice-canvas-visualizer";
import { ImmersiveVoiceAssistant } from "./immersive-voice-assistant";
import type { VoiceState } from "./voice-types";
import type { AddStickersVoiceSubmission } from "../add-stickers-types";
import type { VoiceSessionCallbacks } from "./use-voice-session";

type SubmitHandler = (submission: AddStickersVoiceSubmission) => Promise<{
  ok: boolean;
  message?: string;
}>;

export function VoiceAssistantOverlay() {
  const activeMode = useAssistantStore((s) => s.activeMode);
  const dismiss = useAssistantStore((s) => s.dismiss);
  const setAddStickersOpen = useAssistantStore((s) => s.setAddStickersOpen);
  const locale = useStickerStore((s) => s.settings.locale);

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBackendOnlyMode, setIsBackendOnlyMode] = useState(false);
  const [exiting, setExiting] = useState(false);

  const session = useVoiceSession();
  const finalTranscriptRef = useRef("");
  const finalPrimaryConfidenceRef = useRef({ minimum: 0, segmentCount: 0 });
  const stopReasonRef = useRef("");
  const audioFileRef = useRef<File | null>(null);
  const autoStartedRef = useRef(false);
  const shouldOpenDrawerOnExitRef = useRef(false);
  const exitingRef = useRef(false);

  const shouldRender = activeMode === "voice" || exiting;

  const handleClose = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    const shouldOpen = shouldOpenDrawerOnExitRef.current;
    shouldOpenDrawerOnExitRef.current = false;

    setExiting(true);
    autoStartedRef.current = false;

    if (shouldOpen) {
      setTimeout(() => {
        setAddStickersOpen(true);
      }, 150);
    }

    setTimeout(() => {
      dismiss();
      setExiting(false);
      setVoiceState("idle");
      setFinalTranscript("");
      setInterimTranscript("");
      setError(null);
      exitingRef.current = false;
    }, 250);
  }, [dismiss, setAddStickersOpen]);

  const handleSubmit = useCallback<SubmitHandler>(
    async (submission) => {
      audioFileRef.current = submission.audioFile;
      finalTranscriptRef.current = submission.transcript;
      finalPrimaryConfidenceRef.current = submission.finalPrimaryConfidence;
      stopReasonRef.current = submission.stopReason;

      const result = await analyzeVoiceSubmission(locale, submission);
      if (result.ok) {
        shouldOpenDrawerOnExitRef.current = true;
        setIsBackendOnlyMode(false);
        setVoiceState("idle");
        setError(null);
        handleClose();
      }
      return result;
    },
    [locale, handleClose],
  );

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  const cancelAndClose = useCallback(() => {
    void session.cancel({
      onVoiceStateChange: setVoiceState,
      onTranscriptUpdate: (text) => {
        setFinalTranscript(text);
        finalTranscriptRef.current = text;
      },
      onLiveTranscriptUpdate: setInterimTranscript,
      onBackendOnlyModeChange: setIsBackendOnlyMode,
      onError: setError,
      onSubmit: (s) => handleSubmitRef.current(s),
    });
    handleClose();
  }, [session, handleClose]);

  const sessionCallbacks = useCallback((): VoiceSessionCallbacks => ({
    onVoiceStateChange: setVoiceState,
    onTranscriptUpdate: (text) => {
      setFinalTranscript(text);
      finalTranscriptRef.current = text;
    },
    onLiveTranscriptUpdate: setInterimTranscript,
    onBackendOnlyModeChange: setIsBackendOnlyMode,
    onError: setError,
    onSubmit: (s) => handleSubmitRef.current(s),
  }), []);

  const startListening = useCallback(async () => {
    setFinalTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    setError(null);
    setIsBackendOnlyMode(false);

    const started = await session.start(locale, sessionCallbacks());

    if (!started) {
      setVoiceState("transcript");
      setError("Microphone access denied. Please enable microphone permissions.");
    }
  }, [locale, session, sessionCallbacks]);

  const stopListening = useCallback(() => {
    void session.stop(sessionCallbacks());
  }, [session, sessionCallbacks]);

  const retryTranscript = useCallback(() => {
    setError(null);
    setVoiceState("idle");
    setFinalTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    finalPrimaryConfidenceRef.current = { minimum: 0, segmentCount: 0 };
    audioFileRef.current = null;
    stopReasonRef.current = "";
    setIsBackendOnlyMode(false);
  }, []);

  const handleAnalyzeTranscript = useCallback(async () => {
    setVoiceState("processing");
    setError(null);
    const result = await analyzeVoiceSubmission(locale, {
      transcript: finalTranscript.trim(),
      finalPrimaryConfidence: finalPrimaryConfidenceRef.current,
      audioFile: audioFileRef.current,
      stopReason: stopReasonRef.current || "manual-analyze",
      reason: isBackendOnlyMode ? "local-engine-fail" : undefined,
    });
    if (!result.ok) {
      setVoiceState("transcript");
      setError(result.message ?? "Recognition error. Please try again.");
      return;
    }
    shouldOpenDrawerOnExitRef.current = true;
    setVoiceState("idle");
    setError(null);
    handleClose();
  }, [locale, finalTranscript, isBackendOnlyMode, handleClose]);

  useEffect(() => {
    if (activeMode === "voice" && !autoStartedRef.current) {
      autoStartedRef.current = true;
      const t = setTimeout(() => {
        startListening();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [activeMode, startListening]);

  useEffect(() => {
    return () => {
      void session.teardown();
    };
  }, [session]);

  if (!shouldRender) return null;

  const handleTranscriptChange = (value: string) => {
    setFinalTranscript(value);
    finalTranscriptRef.current = value;
  };

  return (
    <div
      className={`immersive-overlay${exiting ? " out" : ""}`}
      role="dialog"
      aria-modal
      aria-label="Voice assistant"
    >
      <VoiceCanvasVisualizer
        voiceState={voiceState}
        isBackendOnlyMode={isBackendOnlyMode}
        analyser={session.getAnalyser()}
      />

      <ImmersiveVoiceAssistant
        voiceState={voiceState}
        isBackendOnlyMode={isBackendOnlyMode}
        finalTranscript={finalTranscript}
        interimTranscript={interimTranscript}
        error={error}
        exiting={exiting}
        onClose={cancelAndClose}
        onStopListening={stopListening}
        onRetry={() => {
          retryTranscript();
          setTimeout(() => startListening(), 300);
        }}
        onTranscriptChange={handleTranscriptChange}
        onAnalyzeTranscript={handleAnalyzeTranscript}
        isTranscriptEmpty={!finalTranscript.trim()}
      />
    </div>
  );
}
