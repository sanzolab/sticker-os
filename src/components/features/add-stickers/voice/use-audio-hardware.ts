"use client";

import { useRef, useMemo, useCallback } from "react";
import { getAudioContext, resumeAudioContext, suspendAudioContext } from "./audio-context-singleton";
import {
  RMS_SAMPLE_MS,
  CALIBRATION_MS,
  NOISE_FLOOR_MULTIPLIER,
  MIN_ADAPTIVE_THRESHOLD,
  RMS_SMOOTHING_ALPHA,
} from "./voice-constants";
import type { RmsSnapshot } from "./voice-types";

export type AudioHardwareState = {
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  analyser: AnalyserNode | null;
  rms: RmsSnapshot;
  chunks: Blob[];
};

const defaultRms: RmsSnapshot = {
  raw: 0,
  smoothed: 0,
  noiseFloor: 0.005,
  adaptiveThreshold: MIN_ADAPTIVE_THRESHOLD,
  isSpeaking: false,
};

const defaultState: AudioHardwareState = {
  stream: null,
  recorder: null,
  analyser: null,
  rms: defaultRms,
  chunks: [],
};

function chooseRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) ?? "";
}

export function useAudioHardware() {
  const stateRef = useRef<AudioHardwareState>({ ...defaultState });
  const rmsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const calibrationRef = useRef<{ values: number[]; done: boolean }>({ values: [], done: false });
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rmsBufferRef = useRef<Float32Array | null>(null);

  const start = useCallback(
    (signal: AbortSignal): Promise<MediaStream> => {
      return new Promise<MediaStream>((resolve, reject) => {
        if (signal.aborted) {
          reject(new Error("Session aborted before start"));
          return;
        }

        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            if (signal.aborted) {
              stream.getTracks().forEach((track) => track.stop());
              reject(new Error("Session aborted after getUserMedia"));
              return;
            }

            stateRef.current.stream = stream;

            const context = getAudioContext();
            resumeAudioContext().then(() => {
              if (signal.aborted) {
                stream.getTracks().forEach((track) => track.stop());
                reject(new Error("Session aborted after resume"));
                return;
              }

              const source = context.createMediaStreamSource(stream);
              sourceNodeRef.current = source;
              const analyser = context.createAnalyser();
              analyser.fftSize = 2048;
              source.connect(analyser);
              stateRef.current.analyser = analyser;

              rmsBufferRef.current = new Float32Array(analyser.fftSize);

              const recorderMimeType = chooseRecorderMimeType();
              const recorder = recorderMimeType
                ? new MediaRecorder(stream, { mimeType: recorderMimeType })
                : new MediaRecorder(stream);
              stateRef.current.recorder = recorder;
              stateRef.current.chunks = [];

              recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  stateRef.current.chunks.push(event.data);
                }
              };

              recorder.start();

              calibrationRef.current = { values: [], done: false };

              rmsIntervalRef.current = setInterval(() => {
                if (signal.aborted) return;
                const snapshot = sampleRmsSnapshot(
                  stateRef.current.analyser,
                  stateRef.current.rms,
                  calibrationRef.current,
                  rmsBufferRef.current,
                );
                stateRef.current.rms = snapshot;
              }, RMS_SAMPLE_MS);

              resolve(stream);
            });
          })
          .catch((error) => {
            reject(error);
          });
      });
    },
    [],
  );

  const stop = useCallback(async (): Promise<{ chunks: Blob[]; mimeType: string }> => {
    if (rmsIntervalRef.current) {
      clearInterval(rmsIntervalRef.current);
      rmsIntervalRef.current = null;
    }

    const { stream, recorder, analyser } = stateRef.current;

    if (sourceNodeRef.current && analyser) {
      try {
        sourceNodeRef.current.disconnect(analyser);
      } catch { /* ignore */ }
      sourceNodeRef.current = null;
    }

    rmsBufferRef.current = null;

    const stopResult = await new Promise<{ chunks: Blob[]; mimeType: string }>((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve({
          chunks: [...stateRef.current.chunks],
          mimeType: recorder?.mimeType || "audio/webm",
        });
        return;
      }

      recorder.onstop = () => {
        resolve({
          chunks: [...stateRef.current.chunks],
          mimeType: recorder.mimeType || "audio/webm",
        });
      };

      try {
        recorder.stop();
      } catch {
        resolve({
          chunks: [...stateRef.current.chunks],
          mimeType: recorder?.mimeType || "audio/webm",
        });
      }
    });

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    stateRef.current = { ...defaultState };

    await suspendAudioContext();

    return stopResult;
  }, []);

  const getRms = useCallback((): RmsSnapshot => {
    return stateRef.current.rms;
  }, []);

  return useMemo(
    () => ({ start, stop, getRms, stateRef }),
    [start, stop, getRms, stateRef],
  );
}

export function sampleRmsSnapshot(
  analyser: AnalyserNode | null,
  previous: RmsSnapshot,
  calibration: { values: number[]; done: boolean },
  buffer?: Float32Array | null,
): RmsSnapshot {
  if (!analyser) return previous;

  const buf = (buffer ?? new Float32Array(analyser.fftSize)) as Float32Array<ArrayBuffer>;
  analyser.getFloatTimeDomainData(buf);

  let squareTotal = 0;
  for (const value of buf) {
    squareTotal += value * value;
  }
  const raw = Math.sqrt(squareTotal / buf.length);

  if (!calibration.done) {
    calibration.values.push(raw);
    const elapsed = calibration.values.length * RMS_SAMPLE_MS;
    if (elapsed >= CALIBRATION_MS) {
      calibration.done = true;
      const sorted = [...calibration.values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const noiseFloor = Math.max(median ?? 0.001, 0.005);
      return {
        raw,
        smoothed: raw,
        noiseFloor,
        adaptiveThreshold: Math.max(noiseFloor * NOISE_FLOOR_MULTIPLIER, MIN_ADAPTIVE_THRESHOLD),
        isSpeaking: raw > Math.max(noiseFloor * NOISE_FLOOR_MULTIPLIER, MIN_ADAPTIVE_THRESHOLD),
      };
    }
  }

  const smoothed = RMS_SMOOTHING_ALPHA * raw + (1 - RMS_SMOOTHING_ALPHA) * previous.smoothed;
  const noiseFloor = previous.noiseFloor || 0.005;
  const adaptiveThreshold = Math.max(noiseFloor * NOISE_FLOOR_MULTIPLIER, MIN_ADAPTIVE_THRESHOLD);
  const isSpeaking = smoothed > adaptiveThreshold;

  return {
    raw,
    smoothed,
    noiseFloor,
    adaptiveThreshold,
    isSpeaking,
  };
}
