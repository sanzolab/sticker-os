"use client";

import { useRef, useMemo, useCallback } from "react";
import {
  collectRawSpeechAlternatives,
  collectSpeechTranscriptViews,
  getSpeechRecognitionLanguage,
  serializeSpeechRecognitionError,
  type RawSpeechAlternative,
  type SerializedSpeechRecognitionError,
} from "../add-stickers-speech";

export type RecognitionState = {
  instance: SpeechRecognition | null;
  isActive: boolean;
  ended: boolean;
  error: SpeechRecognitionErrorCode | null;
  lastError: SerializedSpeechRecognitionError | null;
  transcript: string;
  finalTranscript: string;
  finalPrimaryConfidence: { minimum: number; segmentCount: number };
  alternatives: RawSpeechAlternative[];
  speechStarted: boolean;
  speechEnded: boolean;
  audioStarted: boolean;
  audioEnded: boolean;
  lastResultTime: number;
};

const defaultState: RecognitionState = {
  instance: null,
  isActive: false,
  ended: true,
  error: null,
  lastError: null,
  transcript: "",
  finalTranscript: "",
  finalPrimaryConfidence: { minimum: 0, segmentCount: 0 },
  alternatives: [],
  speechStarted: false,
  speechEnded: false,
  audioStarted: false,
  audioEnded: false,
  lastResultTime: 0,
};

function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useLocalRecognition() {
  const stateRef = useRef<RecognitionState>({ ...defaultState });

  const start = useCallback((locale: string, sessionId: string, signal: AbortSignal) => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) return;

    if (signal.aborted) return;

    const recognition = new Recognition();
    stateRef.current.instance = recognition;
    stateRef.current.isActive = true;
    stateRef.current.ended = false;
    stateRef.current.error = null;
    stateRef.current.lastError = null;
    stateRef.current.transcript = "";
    stateRef.current.finalTranscript = "";
    stateRef.current.finalPrimaryConfidence = { minimum: 0, segmentCount: 0 };
    stateRef.current.alternatives = [];
    stateRef.current.speechStarted = false;
    stateRef.current.speechEnded = false;
    stateRef.current.audioStarted = false;
    stateRef.current.audioEnded = false;
    stateRef.current.lastResultTime = 0;

    recognition.lang = getSpeechRecognitionLanguage(locale as never);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      if (signal.aborted) return;
      stateRef.current.lastResultTime = Date.now();
    };

    recognition.onaudiostart = () => {
      if (signal.aborted) return;
      stateRef.current.audioStarted = true;
      stateRef.current.audioEnded = false;
    };

    recognition.onaudioend = () => {
      if (signal.aborted) return;
      stateRef.current.audioEnded = true;
    };

    recognition.onspeechstart = () => {
      if (signal.aborted) return;
      stateRef.current.speechStarted = true;
      stateRef.current.speechEnded = false;
    };

    recognition.onspeechend = () => {
      if (signal.aborted) return;
      stateRef.current.speechEnded = true;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (signal.aborted) return;
      stateRef.current.lastResultTime = Date.now();

      const alternatives = collectRawSpeechAlternatives(event);
      const mergedAlternatives = mergeAlternatives(
        stateRef.current.alternatives,
        alternatives,
      );
      stateRef.current.alternatives = mergedAlternatives;

      const transcriptViews = collectSpeechTranscriptViews(event);
      stateRef.current.finalTranscript = transcriptViews.finalTranscript;
      stateRef.current.finalPrimaryConfidence = transcriptViews.finalPrimaryConfidence;
      stateRef.current.transcript = transcriptViews.liveTranscript;
    };

    recognition.onnomatch = (event: SpeechRecognitionEvent) => {
      if (signal.aborted) return;
      const alternatives = collectRawSpeechAlternatives(event);
      stateRef.current.alternatives = alternatives;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (signal.aborted) return;
      stateRef.current.error = event.error;
      stateRef.current.lastError = serializeSpeechRecognitionError(event);
    };

    recognition.onend = () => {
      if (signal.aborted) return;
      stateRef.current.isActive = false;
      stateRef.current.ended = true;
    };

    try {
      recognition.start();
    } catch {
      stateRef.current.isActive = false;
      stateRef.current.ended = true;
    }
  }, []);

  const stop = useCallback((cancel: boolean) => {
    const recognition = stateRef.current.instance;
    stateRef.current.instance = null;
    if (recognition) {
      try {
        if (cancel) {
          recognition.abort();
        } else {
          recognition.stop();
        }
      } catch { /* ignore */ }
    } else {
      stateRef.current.isActive = false;
      stateRef.current.ended = true;
    }
  }, []);

  const getState = useCallback((): RecognitionState => {
    return stateRef.current;
  }, []);

  return useMemo(
    () => ({ start, stop, getState, stateRef }),
    [start, stop, getState, stateRef],
  );
}

function mergeAlternatives(
  existing: RawSpeechAlternative[],
  incoming: RawSpeechAlternative[],
) {
  if (incoming.length === 0) return existing;

  const newItems: RawSpeechAlternative[] = [];
  const seen = new Set(
    existing.map((item) => `${item.resultIndex}-${item.alternativeIndex}-${item.transcript}`),
  );

  for (const item of incoming) {
    const key = `${item.resultIndex}-${item.alternativeIndex}-${item.transcript}`;
    if (seen.has(key)) continue;
    seen.add(key);
    newItems.push(item);
  }

  return newItems.length > 0 ? [...existing, ...newItems] : existing;
}
