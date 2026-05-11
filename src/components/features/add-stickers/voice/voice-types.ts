import type { AddStickersVoiceSubmission } from "../add-stickers-types";

export type VoiceState = "idle" | "listening" | "processing" | "transcript";

export type RmsSnapshot = {
  raw: number;
  smoothed: number;
  noiseFloor: number;
  adaptiveThreshold: number;
  isSpeaking: boolean;
};

/**
 * @reserved Phase 3/5 — immersive assistant hardware handle
 */
export type AudioHardwareHandle = {
  stream: MediaStream;
  recorder: MediaRecorder;
  analyser: AnalyserNode;
  rms: RmsSnapshot;
  chunks: Blob[];
};

/**
 * @reserved Phase 3 — cinematic speech recognition state
 */
export type RecognitionHandle = {
  instance: SpeechRecognition;
  error: SpeechRecognitionErrorCode | null;
};

/**
 * @reserved Phase 3/5 — session context for immersive flow
 */
export type VoiceSessionContext = {
  sessionId: string;
  signal: AbortSignal;
};

/**
 * @reserved Phase 3/5 — immersive assistant params
 */
export type VoiceSessionParams = {
  locale: string;
  onSubmitTranscript: (submission: AddStickersVoiceSubmission) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  onTranscriptUpdate: (transcript: string) => void;
  onVoiceStateChange: (state: VoiceState) => void;
  onBackendOnlyModeChange: (value: boolean) => void;
  onDebugUpdate: (update: Record<string, unknown>) => void;
  onError: (message: string | null) => void;
};
