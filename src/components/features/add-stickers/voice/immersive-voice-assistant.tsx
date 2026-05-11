"use client";

import { RotateCcw, Square, X } from "lucide-react";
import { ImmersiveCaptions } from "./immersive-captions";
import type { VoiceState } from "./voice-types";

interface ImmersiveVoiceAssistantProps {
  voiceState: VoiceState;
  isBackendOnlyMode: boolean;
  finalTranscript: string;
  interimTranscript: string;
  error: string | null;
  exiting: boolean;
  onClose: () => void;
  onStopListening: () => void;
  onRetry: () => void;
  onTranscriptChange: (value: string) => void;
  onAnalyzeTranscript: () => void;
  isTranscriptEmpty: boolean;
}

function statusLabel(voiceState: VoiceState, isBackendOnlyMode: boolean): string {
  if (voiceState === "listening") return isBackendOnlyMode ? "Deep listening…" : "Listening…";
  if (voiceState === "processing") return isBackendOnlyMode ? "Deep processing…" : "Processing…";
  return "";
}

function sessionLabel(voiceState: VoiceState): string | null {
  if (voiceState === "listening") return "Live";
  if (voiceState === "processing") return "Processing";
  return null;
}

export function ImmersiveVoiceAssistant({
  voiceState,
  isBackendOnlyMode,
  finalTranscript,
  interimTranscript,
  error,
  exiting,
  onClose,
  onStopListening,
  onRetry,
  onTranscriptChange,
  onAnalyzeTranscript,
  isTranscriptEmpty,
}: ImmersiveVoiceAssistantProps) {
  const showConfirm = voiceState === "transcript";
  const statusText = statusLabel(voiceState, isBackendOnlyMode);
  const sessionText = sessionLabel(voiceState);

  return (
    <>
      {/* Session status indicator — top-left */}
      {sessionText && (
        <div
          className={`immersive-session-status${
            isBackendOnlyMode ? " immersive-session-status-backend" : ""
          }`}
          aria-live="polite"
        >
          <span className="immersive-session-dot" />
          <span>{sessionText}</span>
        </div>
      )}

      {/* Close button — top-right */}
      <button
        type="button"
        className="immersive-close"
        onClick={onClose}
        aria-label="Close voice assistant"
      >
        <X className="size-4" />
      </button>

      {/* Captions — centered */}
      <ImmersiveCaptions
        finalTranscript={finalTranscript}
        interimTranscript={interimTranscript}
        voiceState={voiceState}
      />

      {/* Status text — bottom area */}
      {statusText && (
        <div
          className={`immersive-status${
            isBackendOnlyMode ? " immersive-status-backend" : ""
          }`}
        >
          <p>{statusText}</p>
        </div>
      )}

      {/* Contextual hints — below status */}
      {voiceState === "listening" && (
        <p className="immersive-hints">Speak naturally…</p>
      )}

      {/* Stop button — listening only */}
      {voiceState === "listening" && (
        <button
          type="button"
          onClick={onStopListening}
          className="immerse-stop-button"
          aria-label="Stop recording"
        >
          <Square className="size-5 fill-white/50" />
        </button>
      )}

      {/* Confirm panel — transcript editing */}
      {showConfirm && (
        <div className={`immersive-confirm${exiting ? " out" : ""}`}>
          <div className="space-y-4">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Review transcript
            </p>

            <textarea
              className="min-h-24 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-white/20 focus:bg-white/8"
              value={finalTranscript}
              placeholder="Speak to transcribe…"
              onChange={(e) => onTranscriptChange(e.target.value)}
            />

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl bg-white/90 px-4 py-3 text-sm font-medium text-black transition active:scale-[0.98] disabled:opacity-40"
                disabled={isTranscriptEmpty}
                onClick={onAnalyzeTranscript}
              >
                Analyze
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70 transition active:scale-[0.98]"
                onClick={onRetry}
              >
                <RotateCcw className="size-3.5" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
