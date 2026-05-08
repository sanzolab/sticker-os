"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Mic, RotateCcw, Square, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import {
  collectRawSpeechAlternatives,
  collectSpeechTranscriptViews,
  getSpeechRecognitionLanguage,
  serializeSpeechRecognitionError,
  type RawSpeechAlternative,
  type SerializedSpeechRecognitionError,
} from "./add-stickers-speech";
import type { AddStickersVoiceSubmission } from "./add-stickers-types";

type VoiceState = "idle" | "listening" | "processing" | "transcript";
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

const silenceThreshold = 0.015;
const silenceStopMs = 2500;
const maxRecordingMs = 15000;
const sampleEveryMs = 100;

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
  const [debug, setDebug] = useState<SpeechDebugState>(() => getInitialDebugState());

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionEndedRef = useRef(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderEndedRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finalTranscriptRef = useRef("");
  const finalPrimaryConfidenceRef = useRef({ minimum: 0, segmentCount: 0 });
  const alternativesRef = useRef<RawSpeechAlternative[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioFileRef = useRef<File | null>(null);
  const shouldProcessRef = useRef(false);
  const cancelledRef = useRef(false);
  const stopReasonRef = useRef("");
  const recordingDurationRef = useRef(0);
  const silenceDurationRef = useRef(0);
  const finalizedRef = useRef(false);
  const recognitionErrorRef = useRef<SpeechRecognitionErrorCode | null>(null);

  async function refreshMicrophonePermission() {
    const microphonePermission = await queryMicrophonePermission();
    setDebug((current) => ({ ...current, microphonePermission }));
  }

  const startListening = async () => {
    if (onBeforeStartCapture) {
      const shouldStart = await onBeforeStartCapture();
      if (!shouldStart) return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError(t(locale, "addStickers.voice.unsupported"));
      return;
    }

    await finishVoiceSession("reset-before-start", true);
    await refreshMicrophonePermission();

    setVoiceState("listening");
    setError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    finalPrimaryConfidenceRef.current = { minimum: 0, segmentCount: 0 };
    alternativesRef.current = [];
    audioChunksRef.current = [];
    audioFileRef.current = null;
    cancelledRef.current = false;
    shouldProcessRef.current = false;
    finalizedRef.current = false;
    recognitionEndedRef.current = false;
    recorderEndedRef.current = true;
    recognitionErrorRef.current = null;
    recordingDurationRef.current = 0;
    silenceDurationRef.current = 0;

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
      lastEvent: "start requested",
    }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorderMimeType = chooseRecorderMimeType();
      const recorder = recorderMimeType
        ? new MediaRecorder(stream, { mimeType: recorderMimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorderEndedRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        recorderEndedRef.current = true;
        audioFileRef.current = buildRecordedAudioFile(audioChunksRef.current, recorder.mimeType);
        setDebug((current) => ({
          ...current,
          recording: false,
          fallbackAudioReady: Boolean(audioFileRef.current),
          audioMimeType: recorder.mimeType || current.audioMimeType,
          lastEvent: "mediaRecorder.onstop",
        }));
        void maybeSubmitVoice();
      };

      recorder.start();
      setDebug((current) => ({
        ...current,
        recording: true,
        audioMimeType: recorder.mimeType || recorderMimeType || "audio/webm",
        lastEvent: "mediaRecorder.start",
      }));

      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      analysisIntervalRef.current = setInterval(() => {
        const activeAnalyser = analyserRef.current;
        if (!activeAnalyser || finalizedRef.current) return;
        recordingDurationRef.current += sampleEveryMs;
        const rms = sampleRms(activeAnalyser);

        if (rms < silenceThreshold) {
          silenceDurationRef.current += sampleEveryMs;
        } else {
          silenceDurationRef.current = 0;
        }

        setDebug((current) => ({
          ...current,
          recordingDurationMs: recordingDurationRef.current,
          silenceDurationMs: silenceDurationRef.current,
        }));

        if (silenceDurationRef.current >= silenceStopMs && !finalizedRef.current) {
          void finishVoiceSession("silence-timeout", false);
        }
      }, sampleEveryMs);

      maxDurationTimeoutRef.current = setTimeout(() => {
        if (!finalizedRef.current) {
          void finishVoiceSession("max-duration", false);
        }
      }, maxRecordingMs);

      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = getSpeechRecognitionLanguage(locale);
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;

      recognition.onstart = () => {
        setDebug((current) => ({
          ...current,
          lifecycleState: "listening",
          lastEvent: "onstart",
        }));
      };

      recognition.onaudiostart = () => {
        setDebug((current) => ({
          ...current,
          audioStarted: true,
          audioEnded: false,
          lastEvent: "onaudiostart",
        }));
      };

      recognition.onaudioend = () => {
        setDebug((current) => ({
          ...current,
          audioEnded: true,
          lastEvent: "onaudioend",
        }));
      };

      recognition.onspeechstart = () => {
        setDebug((current) => ({
          ...current,
          speechStarted: true,
          speechEnded: false,
          lastEvent: "onspeechstart",
        }));
      };

      recognition.onspeechend = () => {
        setDebug((current) => ({
          ...current,
          speechEnded: true,
          lastEvent: "onspeechend",
        }));
      };

      recognition.onresult = (event) => {
        const alternatives = collectRawSpeechAlternatives(event);
        const mergedAlternatives = mergeAlternatives(
          alternativesRef.current,
          alternatives,
        );
        alternativesRef.current = mergedAlternatives;
        const transcriptViews = collectSpeechTranscriptViews(event);
        finalTranscriptRef.current = transcriptViews.finalTranscript;
        finalPrimaryConfidenceRef.current = transcriptViews.finalPrimaryConfidence;
        setTranscript(transcriptViews.liveTranscript);
        setDebug((current) => ({
          ...current,
          rawAlternatives: mergedAlternatives,
          lastRawTranscript: mergedAlternatives.map((item) => item.transcript).join(" | "),
          lastEvent: "onresult",
        }));
      };

      recognition.onnomatch = (event) => {
        const alternatives = collectRawSpeechAlternatives(event);
        setDebug((current) => ({
          ...current,
          rawAlternatives: alternatives,
          lastRawTranscript: alternatives.map((item) => item.transcript).join(" | "),
          lastEvent: "onnomatch",
        }));
      };

      recognition.onerror = (event) => {
        recognitionErrorRef.current = event.error;
        const serializedError = serializeSpeechRecognitionError(event);
        setDebug((current) => ({
          ...current,
          lastError: serializedError,
          lastEvent: "onerror",
        }));
      };

      recognition.onend = () => {
        recognitionEndedRef.current = true;
        setDebug((current) => ({
          ...current,
          lifecycleState: "ended",
          lastEvent: "onend",
        }));
        void maybeSubmitVoice();
      };

      recognition.start();
    } catch {
      setVoiceState("transcript");
      setError(t(locale, "addStickers.voice.permissionError"));
      setDebug((current) => ({
        ...current,
        lifecycleState: "ended",
        stopReason: "microphone error",
        lastEvent: "start failed",
      }));
      await finishVoiceSession("start-failed", true);
    }
  };

  const maybeSubmitVoice = async () => {
    if (!shouldProcessRef.current) return;
    if (!recognitionEndedRef.current || !recorderEndedRef.current) return;

    shouldProcessRef.current = false;
    setVoiceState("processing");
    setDebug((current) => ({
      ...current,
      lifecycleState: "processing",
      lastEvent: "submit voice payload",
    }));

    const result = await onSubmitTranscript({
      transcript: finalTranscriptRef.current.trim(),
      finalPrimaryConfidence: finalPrimaryConfidenceRef.current,
      audioFile: audioFileRef.current,
      stopReason: stopReasonRef.current,
    }).catch(() => ({
      ok: false,
      message: t(locale, "addStickers.voice.connectionError"),
    }));

    if (!result.ok) {
      setVoiceState("transcript");
      setError(result.message ?? t(locale, "addStickers.voice.recognitionError"));
      return;
    }

    setVoiceState("idle");
    setError(null);
  };

  async function finishVoiceSession(reason: string, cancel: boolean) {
    stopReasonRef.current = reason;
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    cancelledRef.current = cancel;
    shouldProcessRef.current = !cancel;

    setDebug((current) => ({
      ...current,
      lifecycleState: "stopping",
      stopReason: reason,
      lastEvent: cancel ? "cancel requested" : "stop requested",
    }));

    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        if (cancel) recognition.abort();
        else recognition.stop();
      } catch {}
    } else {
      recognitionEndedRef.current = true;
    }

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        recorderEndedRef.current = true;
      }
    } else {
      recorderEndedRef.current = true;
    }

    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());

    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      await context.close().catch(() => undefined);
    }
    analyserRef.current = null;

    if (cancel) {
      setVoiceState("idle");
      setError(null);
      shouldProcessRef.current = false;
    }
  }

  useEffect(() => {
    return () => {
      void finishVoiceSession("component-unmount", true);
    };
  }, []);

  const stopListening = () => {
    void finishVoiceSession("manual-stop", false);
  };

  const cancelListening = () => {
    void finishVoiceSession("manual-cancel", true);
  };

  const retryTranscript = () => {
    setError(null);
    setVoiceState("idle");
    setTranscript("");
    finalTranscriptRef.current = "";
    finalPrimaryConfidenceRef.current = { minimum: 0, segmentCount: 0 };
    alternativesRef.current = [];
    audioFileRef.current = null;
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
  };

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

        {voiceState === "idle" && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="pill"
              className="shadow-none"
              disabled={loading || !speechSupported}
              onClick={() => void startListening()}
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
                {t(locale, "addStickers.voice.listening")}
              </p>
            </div>
            <div className="min-h-16 rounded-md border border-border bg-background/70 px-3 py-2 text-sm">
              {transcript ? (
                transcript
              ) : (
                <span className="text-muted-foreground">
                  {t(locale, "addStickers.voice.transcriptPlaceholder")}
                </span>
              )}
            </div>
          </div>
        )}

        {voiceState === "processing" && (
          <p className="text-xs text-muted-foreground">
            {t(locale, "addStickers.voice.processing")}
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
                    finalPrimaryConfidence: { minimum: 1, segmentCount: 1 },
                    audioFile: audioFileRef.current,
                    stopReason: "manual-analyze",
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

function chooseRecorderMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) ?? "";
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

function sampleRms(analyser: AnalyserNode) {
  const buffer = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buffer);

  let squareTotal = 0;
  for (const value of buffer) {
    const centered = (value - 128) / 128;
    squareTotal += centered * centered;
  }
  return Math.sqrt(squareTotal / buffer.length);
}

function mergeAlternatives(
  existing: RawSpeechAlternative[],
  incoming: RawSpeechAlternative[],
) {
  const merged = [...existing];
  const seen = new Set(
    merged.map((item) => `${item.resultIndex}-${item.alternativeIndex}-${item.transcript}`),
  );

  for (const item of incoming) {
    const key = `${item.resultIndex}-${item.alternativeIndex}-${item.transcript}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
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
