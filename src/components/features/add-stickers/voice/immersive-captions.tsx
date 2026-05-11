"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VoiceState } from "./voice-types";

interface ImmersiveCaptionsProps {
  finalTranscript: string;
  interimTranscript: string;
  voiceState: VoiceState;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+|\n/)
    .filter((c) => c.trim().length >= 3);
}

export function ImmersiveCaptions({
  finalTranscript,
  interimTranscript,
  voiceState,
}: ImmersiveCaptionsProps) {
  const [displayInterim, setDisplayInterim] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (voiceState !== "listening" || !interimTranscript.trim()) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDisplayInterim(interimTranscript);
    }, 150);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [interimTranscript, voiceState]);

  const isListening = voiceState === "listening";
  const finalChunks = useMemo(
    () => (finalTranscript ? splitSentences(finalTranscript).slice(-2) : []),
    [finalTranscript],
  );

  const effectiveInterim = isListening ? displayInterim : "";

  let currentText = "";
  let prevText = "";

  if (effectiveInterim) {
    currentText = effectiveInterim;
    if (finalChunks.length > 0) {
      prevText = finalChunks[finalChunks.length - 1];
    }
  } else if (finalChunks.length === 2) {
    prevText = finalChunks[0];
    currentText = finalChunks[1];
  } else if (finalChunks.length === 1) {
    currentText = finalChunks[0];
  }

  if (!currentText) return null;

  return (
    <div className="immersive-captions" aria-live="polite" aria-atomic="false">
      {prevText && (
        <p
          key={`prev-${prevText.slice(0, 16)}`}
          className="immersive-caption immersive-caption-prev"
        >
          {prevText}
        </p>
      )}
      <p
        key={`cur-${currentText.slice(0, 16)}`}
        className={`immersive-caption immersive-caption-current${
          effectiveInterim ? " immersive-caption-interim" : ""
        }`}
      >
        {currentText}
      </p>
    </div>
  );
}
