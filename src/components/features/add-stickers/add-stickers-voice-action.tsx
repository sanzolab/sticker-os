"use client";

import { useEffect, useId, useRef, useState, useCallback } from "react";
import { Mic, RotateCcw, Square, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useStickerStore } from "@/lib/store";
import {
  getSpeechRecognitionLanguage,
  type RawSpeechAlternative,
  type SerializedSpeechRecognitionError,
} from "./add-stickers-speech";
import type { AddStickersVoiceSubmission } from "./add-stickers-types";
import { useVoiceSession } from "./voice/use-voice-session";
import type { VoiceState } from "./voice/voice-types";

type MicrophonePermissionStatus =
  | PermissionState
  | "unsupported"
  | "error"
  | "unknown";

type SpeechDebugState = {
  lifecycleState: "idle" | "starting" | "listening" | "stopping" | "ended" | "processing";
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  microphonePermission: MicrophonePermissionStatus;
  secureContext: boolean | "unknown";
  protocol: string;
  host: string;
  recording: boolean;
  recordingDurationMs: number;
  silenceDurationMs: number;
  stopReason: string;
  audioMimeType: string;
  fallbackAudioReady: boolean;
  audioStarted: boolean;
  audioEnded: boolean;
  speechStarted: boolean;
  speechEnded: boolean;
  lastError: SerializedSpeechRecognitionError | null;
  lastRawTranscript: string;
  rawAlternatives: RawSpeechAlternative[];
  lastEvent: string;
};

export function AddStickersVoiceAction({
  loading,
  onSubmitAudio,
  onSubmitTranscript,
  onBeforeStartCapture,
}: {
  loading: boolean;
  onSubmitAudio: (file: File) => void | Promise<void>;
  onSubmitTranscript: (submission: AddStickersVoiceSubmission) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  onBeforeStartCapture?: () => boolean | Promise<boolean>;
}) {
  const inputId = useId();
  const locale = useStickerStore((state) => state.settings.locale);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [speechSupported] = useState(() => Boolean(getSpeechRecognitionConstructor()));
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBackendOnlyMode, setIsBackendOnlyMode] = useState(false);
  const [debug, setDebug] = useState<SpeechDebugState>(() => getInitialDebugState());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const finalTranscriptRef = useRef("");
  const finalPrimaryConfidenceRef = useRef({ minimum: 0, segmentCount: 0 });
  const audioFileRef = useRef<File | null>(null);
  const stopReasonRef = useRef("");
  const isBackendOnlyModeRef = useRef(false);

  const session = useVoiceSession();

  const handleSubmit = useCallback(
    async (submission: AddStickersVoiceSubmission) => {
      audioFileRef.current = submission.audioFile;
      finalTranscriptRef.current = submission.transcript;
      finalPrimaryConfidenceRef.current = submission.finalPrimaryConfidence;
      stopReasonRef.current = submission.stopReason;

      const result = await onSubmitTranscript(submission);
      if (result.ok) {
        setIsBackendOnlyMode(false);
        isBackendOnlyModeRef.current = false;
        setVoiceState("idle");
        setError(null);
      }
      return result;
    },
    [onSubmitTranscript],
  );

  const startVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = session.getAnalyser();
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#94a3b8");
    gradient.addColorStop(1, "#0070f3");

    const SKIP_THRESHOLD_MS = 20;
    const SLOW_FRAMES_TO_DOWNGRADE = 3;
    const RECOVERY_FRAMES = 10;

    let frameCount = 0;
    let lastFrameTime = performance.now();
    let consecutiveSlowFrames = 0;
    let consecutiveFastFrames = 0;
    let is30fps = typeof navigator !== "undefined"
      && navigator.hardwareConcurrency !== undefined
      && navigator.hardwareConcurrency <= 4;

    const draw = () => {
      if (!canvasRef.current) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const now = performance.now();
      const delta = now - lastFrameTime;
      lastFrameTime = now;

      if (delta > SKIP_THRESHOLD_MS) {
        consecutiveSlowFrames++;
        consecutiveFastFrames = 0;
      } else {
        consecutiveFastFrames++;
        consecutiveSlowFrames = 0;
      }

      if (consecutiveSlowFrames >= SLOW_FRAMES_TO_DOWNGRADE) {
        is30fps = true;
      } else if (consecutiveFastFrames >= RECOVERY_FRAMES) {
        is30fps = false;
      }

      frameCount++;
      if (is30fps && frameCount % 2 !== 0) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, [session]);

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  async function refreshMicrophonePermission() {
    const microphonePermission = await queryMicrophonePermission();
    setDebug((current) => ({ ...current, microphonePermission }));
  }

  const prepareCapture = useCallback(async () => {
    if (onBeforeStartCapture) {
      const shouldStart = await onBeforeStartCapture();
      if (!shouldStart) return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError(t(locale, "addStickers.voice.unsupported"));
      return;
    }

    await session.cleanup();
    await refreshMicrophonePermission();

    setTranscript("");
    finalTranscriptRef.current = "";
    finalPrimaryConfidenceRef.current = { minimum: 0, segmentCount: 0 };
    audioFileRef.current = null;
    stopReasonRef.current = "";
    setIsBackendOnlyMode(false);
    isBackendOnlyModeRef.current = false;

    setDebug((current) => ({
      ...current,
      lifecycleState: "starting",
      language: getSpeechRecognitionLanguage(locale),
      continuous: true,
      interimResults: true,
      maxAlternatives: 5,
      secureContext: getSecureContext(),
      protocol: getLocationProtocol(),
      host: getLocationHost(),
      recording: true,
      recordingDurationMs: 0,
      silenceDurationMs: 0,
      stopReason: "",
      audioMimeType: "",
      fallbackAudioReady: false,
      audioStarted: false,
      audioEnded: false,
      speechStarted: false,
      speechEnded: false,
      lastError: null,
      lastRawTranscript: "",
      rawAlternatives: [],
      lastEvent: "start requested",
    }));

    startVisualizer();

    const started = await session.start(locale, {
      onVoiceStateChange: (state) => {
        setVoiceState(state);
      },
      onTranscriptUpdate: (text) => {
        setTranscript(text);
        finalTranscriptRef.current = text;
      },
      onLiveTranscriptUpdate: (text) => {
        setTranscript(text);
      },
      onBackendOnlyModeChange: (value) => {
        setIsBackendOnlyMode(value);
        isBackendOnlyModeRef.current = value;
      },
      onError: setError,
      onSubmit: handleSubmit,
    });

    if (!started) {
      stopVisualizer();
      setVoiceState("transcript");
      setError(t(locale, "addStickers.voice.permissionError"));
      setDebug((current) => ({
        ...current,
        lifecycleState: "ended",
        stopReason: "microphone error",
        lastEvent: "start failed",
      }));
    }
  }, [locale, session, onBeforeStartCapture, startVisualizer, stopVisualizer, handleSubmit]);

  const stopListening = useCallback(() => {
    void session.stop({
      onVoiceStateChange: setVoiceState,
      onTranscriptUpdate: (text) => { setTranscript(text); finalTranscriptRef.current = text; },
      onLiveTranscriptUpdate: setTranscript,
      onBackendOnlyModeChange: (value) => { setIsBackendOnlyMode(value); isBackendOnlyModeRef.current = value; },
      onError: setError,
      onSubmit: handleSubmit,
    });
    stopVisualizer();
  }, [session, stopVisualizer, handleSubmit]);

  const cancelListening = useCallback(() => {
    void session.cancel({
      onVoiceStateChange: setVoiceState,
      onTranscriptUpdate: (text) => { setTranscript(text); finalTranscriptRef.current = text; },
      onLiveTranscriptUpdate: setTranscript,
      onBackendOnlyModeChange: (value) => { setIsBackendOnlyMode(value); isBackendOnlyModeRef.current = value; },
      onError: setError,
      onSubmit: handleSubmit,
    });
    stopVisualizer();
  }, [session, stopVisualizer, handleSubmit]);

  const retryTranscript = useCallback(() => {
    setError(null);
    setVoiceState("idle");
    setTranscript("");
    finalTranscriptRef.current = "";
    finalPrimaryConfidenceRef.current = { minimum: 0, segmentCount: 0 };
    audioFileRef.current = null;
    stopReasonRef.current = "";
    setIsBackendOnlyMode(false);
    isBackendOnlyModeRef.current = false;
    setDebug((current) => ({
      ...current,
      lifecycleState: "idle",
      recording: false,
      recordingDurationMs: 0,
      silenceDurationMs: 0,
      stopReason: "retry reset",
      fallbackAudioReady: false,
      rawAlternatives: [],
      lastRawTranscript: "",
      lastError: null,
      lastEvent: "retry reset",
    }));
  }, []);

  useEffect(() => {
    return () => {
      stopVisualizer();
      void session.teardown();
    };
  }, [session, stopVisualizer]);

  return (
    <Card className="border-accent bg-accent/40 p-4">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-full bg-background p-2 text-primary">
            <Mic className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-sm font-semibold">
              {t(locale, "addStickers.voice.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(locale, "addStickers.voice.description")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(locale, "addStickers.voice.example")}
            </p>
          </div>
        </div>

        <div className={cn(
          "transition-[opacity,max-height] duration-500 ease-in-out overflow-hidden",
          (voiceState === "listening" || voiceState === "processing")
            ? "opacity-100 max-h-64"
            : "opacity-0 max-h-0",
        )}>
          <div className={cn(
            "transition-transform duration-700 ease-in-out",
            isBackendOnlyMode ? "scale-125 visualizer-pulse" : "scale-100",
          )}>
            <canvas ref={canvasRef} className="w-full h-48 rounded-md" />
          </div>
        </div>

        {voiceState === "idle" && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="pill"
              className="shadow-none"
              disabled={loading || !speechSupported}
              onClick={() => void prepareCapture()}
            >
              <Mic className="size-4" />
              {t(locale, "addStickers.voice.start")}
            </Button>
            <Button
              asChild
              variant="outline"
              size="pill"
              className="shadow-none"
              aria-disabled={loading}
            >
              <label htmlFor={inputId}>
                <Upload className="size-4" />
                {t(locale, "addStickers.voice.upload")}
              </label>
            </Button>
          </div>
        )}

        {voiceState === "listening" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="pill"
                className="shadow-none"
                onClick={stopListening}
              >
                <Square className="size-4" />
                {t(locale, "addStickers.voice.stop")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="pill"
                className="shadow-none"
                onClick={cancelListening}
              >
                <X className="size-4" />
                {t(locale, "common.cancel")}
              </Button>
              <p className="basis-full text-xs text-muted-foreground">
                {isBackendOnlyMode
                  ? t(locale, "addStickers.voice.listening")
                  : t(locale, "addStickers.voice.listening")}
              </p>
            </div>
            {!isBackendOnlyMode && (
              <div className="min-h-16 rounded-md border border-border bg-background/70 px-3 py-2 text-sm">
                {transcript ? (
                  transcript
                ) : (
                  <span className="text-muted-foreground">
                    {t(locale, "addStickers.voice.transcriptPlaceholder")}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {voiceState === "processing" && (
          <p className="text-xs text-muted-foreground">
            {isBackendOnlyMode ? t(locale, "addStickers.voice.deepProcessing") : t(locale, "addStickers.voice.processing")}
          </p>
        )}

        {voiceState === "transcript" && (
          <div className="space-y-3">
            <label
              htmlFor={`${inputId}-transcript`}
              className="text-xs font-medium text-muted-foreground"
            >
              {t(locale, "addStickers.voice.transcriptLabel")}
            </label>
            <textarea
              id={`${inputId}-transcript`}
              className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              value={transcript}
              placeholder={t(locale, "addStickers.voice.transcriptPlaceholder")}
              disabled={loading}
              onChange={(event) => {
                setTranscript(event.target.value);
                finalTranscriptRef.current = event.target.value;
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="pill"
                className="shadow-none"
                disabled={loading || !transcript.trim()}
                onClick={() => {
                  setVoiceState("processing");
                  setError(null);
                  void onSubmitTranscript({
                    transcript: transcript.trim(),
                    finalPrimaryConfidence: finalPrimaryConfidenceRef.current,
                    audioFile: audioFileRef.current,
                    stopReason: stopReasonRef.current || "manual-analyze",
                  }).then((result) => {
                    if (!result.ok) {
                      setVoiceState("transcript");
                      setError(result.message ?? t(locale, "addStickers.voice.recognitionError"));
                      return;
                    }
                    setVoiceState("idle");
                    setError(null);
                  });
                }}
              >
                {t(locale, "addStickers.voice.analyzeTranscript")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="pill"
                className="shadow-none"
                disabled={loading}
                onClick={retryTranscript}
              >
                <RotateCcw className="size-4" />
                {t(locale, "addStickers.voice.retry")}
              </Button>
            </div>
          </div>
        )}

        {!speechSupported && (
          <p className="text-xs text-muted-foreground">
            {t(locale, "addStickers.voice.unsupported")}
          </p>
        )}

        {error && (
          <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <SpeechRecognitionDebugPanel
          debug={debug}
          voiceState={voiceState}
          speechSupported={speechSupported}
        />
      </div>

      <input
        id={inputId}
        type="file"
        accept="audio/*"
        className="sr-only"
        disabled={loading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onSubmitAudio(file);
          event.target.value = "";
        }}
      />
    </Card>
  );
}

function SpeechRecognitionDebugPanel({
  debug,
  voiceState,
  speechSupported,
}: {
  debug: SpeechDebugState;
  voiceState: VoiceState;
  speechSupported: boolean;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/70 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Speech debug</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
          {debug.lifecycleState}
        </span>
      </div>
      <dl className="grid gap-1 sm:grid-cols-2">
        <DebugItem label="Voice state" value={voiceState} />
        <DebugItem label="Supported" value={speechSupported ? "yes" : "no"} />
        <DebugItem label="Mic permission" value={debug.microphonePermission} />
        <DebugItem
          label="Secure context"
          value={`${String(debug.secureContext)} (${debug.protocol}//${debug.host})`}
        />
        <DebugItem label="Language" value={debug.language || "not set"} />
        <DebugItem
          label="Config"
          value={`continuous=${debug.continuous}, interim=${debug.interimResults}, alternatives=${debug.maxAlternatives}`}
        />
        <DebugItem label="Recording" value={debug.recording ? "active" : "inactive"} />
        <DebugItem label="Duration" value={`${Math.round(debug.recordingDurationMs)}ms`} />
        <DebugItem label="Silence" value={`${Math.round(debug.silenceDurationMs)}ms`} />
        <DebugItem label="Stop reason" value={debug.stopReason || "none"} />
        <DebugItem label="Audio mime" value={debug.audioMimeType || "unknown"} />
        <DebugItem label="Fallback audio" value={debug.fallbackAudioReady ? "yes" : "no"} />
        <DebugItem label="Audio" value={formatStartedEnded(debug.audioStarted, debug.audioEnded)} />
        <DebugItem label="Speech" value={formatStartedEnded(debug.speechStarted, debug.speechEnded)} />
        <DebugItem label="Last event" value={debug.lastEvent || "none"} />
        <DebugItem
          label="Last error"
          value={
            debug.lastError
              ? `${debug.lastError.error}: ${debug.lastError.message || "(no message)"}`
              : "none"
          }
        />
      </dl>
      <div className="space-y-1">
        <p className="font-medium text-muted-foreground">Raw transcript</p>
        <p className="min-h-6 rounded-sm bg-muted px-2 py-1">
          {debug.lastRawTranscript || "none"}
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-medium text-muted-foreground">Raw alternatives</p>
        <div className="max-h-24 overflow-auto rounded-sm bg-muted px-2 py-1">
          {debug.rawAlternatives.length > 0 ? (
            <ul className="space-y-1">
              {debug.rawAlternatives.map((alternative) => (
                <li
                  key={`${alternative.resultIndex}-${alternative.alternativeIndex}-${alternative.transcript}`}
                >
                  {alternative.isFinal ? "final" : "interim"} r
                  {alternative.resultIndex}/a{alternative.alternativeIndex}:{" "}
                  {alternative.transcript} ({alternative.confidence.toFixed(2)})
                </li>
              ))}
            </ul>
          ) : (
            "none"
          )}
        </div>
      </div>
      {debug.lastError && (
        <pre className="max-h-24 overflow-auto rounded-sm bg-muted px-2 py-1 font-mono text-[11px]">
          {JSON.stringify(debug.lastError, null, 2)}
        </pre>
      )}
    </div>
  );
}

function DebugItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

async function queryMicrophonePermission(): Promise<MicrophonePermissionStatus> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unsupported";

  try {
    const permission = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return permission.state;
  } catch {
    return "error";
  }
}

function getInitialDebugState(): SpeechDebugState {
  return {
    lifecycleState: "idle",
    language: "",
    continuous: false,
    interimResults: false,
    maxAlternatives: 0,
    microphonePermission: "unknown",
    secureContext: getSecureContext(),
    protocol: getLocationProtocol(),
    host: getLocationHost(),
    recording: false,
    recordingDurationMs: 0,
    silenceDurationMs: 0,
    stopReason: "",
    audioMimeType: "",
    fallbackAudioReady: false,
    audioStarted: false,
    audioEnded: false,
    speechStarted: false,
    speechEnded: false,
    lastError: null,
    lastRawTranscript: "",
    rawAlternatives: [],
    lastEvent: "",
  };
}

export function normalizeRecordedAudioMimeType(value: string) {
  const normalized = value.toLowerCase();
  const container = normalized.split(";")[0]?.trim() ?? normalized;

  if (container.includes("webm")) return "audio/webm";
  if (container.includes("ogg")) return "audio/ogg";
  if (container.includes("mp4") || container.includes("m4a")) return "audio/mp4";
  if (container.includes("mpeg") || container.includes("mp3")) return "audio/mpeg";
  if (container.includes("wav")) return "audio/wav";

  return "audio/webm";
}

function getSecureContext() {
  if (typeof window === "undefined") return "unknown";
  return window.isSecureContext;
}

function getLocationProtocol() {
  if (typeof window === "undefined") return "unknown:";
  return window.location.protocol;
}

function getLocationHost() {
  if (typeof window === "undefined") return "unknown";
  return window.location.host;
}

function formatStartedEnded(started: boolean, ended: boolean) {
  return `started=${started}, ended=${ended}`;
}
