import type { Locale } from "@/lib/i18n";

const fallbackLanguageByBase: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
};

const recognitionLanguageByLocale: Record<Locale, string> = {
  en: "en-US",
  es: "es-CO",
};

export function getSpeechRecognitionLanguageHint(
  languages = getBrowserLanguages(),
) {
  for (const language of languages) {
    const normalized = language.trim();
    const baseLanguage = normalized.split("-")[0]?.toLowerCase();

    if (!baseLanguage || !(baseLanguage in fallbackLanguageByBase)) {
      continue;
    }

    return normalized.includes("-")
      ? normalized
      : fallbackLanguageByBase[baseLanguage];
  }

  return undefined;
}

export function getSpeechRecognitionLanguage(
  locale: Locale,
  languages = getBrowserLanguages(),
) {
  return getSpeechRecognitionLanguageHint(languages) ?? recognitionLanguageByLocale[locale];
}

export type RawSpeechAlternative = {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  resultIndex: number;
  alternativeIndex: number;
};

export type FinalPrimarySpeechConfidenceSummary = {
  minimum: number;
  segmentCount: number;
};

export type SpeechTranscriptViews = {
  liveTranscript: string;
  finalTranscript: string;
  finalPrimaryConfidence: FinalPrimarySpeechConfidenceSummary;
};

export type SerializedSpeechRecognitionError = {
  type: string;
  error: SpeechRecognitionErrorCode;
  message: string;
  timeStamp: number;
};

export function collectRawSpeechAlternatives(event: SpeechRecognitionEvent) {
  const alternatives: RawSpeechAlternative[] = [];

  for (let resultIndex = event.resultIndex; resultIndex < event.results.length; resultIndex += 1) {
    const result = event.results[resultIndex];
    if (!result) continue;

    for (
      let alternativeIndex = 0;
      alternativeIndex < result.length;
      alternativeIndex += 1
    ) {
      const alternative = result[alternativeIndex];
      if (!alternative?.transcript) continue;

      alternatives.push({
        transcript: alternative.transcript,
        confidence: alternative.confidence,
        isFinal: result.isFinal,
        resultIndex,
        alternativeIndex,
      });
    }
  }

  return alternatives;
}

export function collectSpeechTranscriptViews(
  event: SpeechRecognitionEvent,
): SpeechTranscriptViews {
  const finalParts: string[] = [];
  const finalPrimaryConfidences: number[] = [];
  let currentInterimPrimary = "";

  for (let resultIndex = 0; resultIndex < event.results.length; resultIndex += 1) {
    const result = event.results[resultIndex];
    if (!result) continue;

    const primary = result[0];
    const transcript = primary?.transcript?.trim();
    if (!transcript) continue;

    if (result.isFinal) {
      finalParts.push(transcript);
      finalPrimaryConfidences.push(primary.confidence);
    } else {
      currentInterimPrimary = transcript;
    }
  }

  const finalTranscript = finalParts.join(" ").trim();
  const liveTranscript = `${finalTranscript} ${currentInterimPrimary}`.trim();
  const minimumConfidence = finalPrimaryConfidences.length
    ? Math.min(...finalPrimaryConfidences)
    : 0;

  return {
    liveTranscript,
    finalTranscript,
    finalPrimaryConfidence: {
      minimum: Number.isFinite(minimumConfidence) ? minimumConfidence : 0,
      segmentCount: finalPrimaryConfidences.length,
    },
  };
}

export function serializeSpeechRecognitionError(
  event: SpeechRecognitionErrorEvent,
): SerializedSpeechRecognitionError {
  return {
    type: event.type,
    error: event.error,
    message: event.message,
    timeStamp: event.timeStamp,
  };
}

export function shouldRestartSpeechRecognition({
  error,
  hasTranscript,
  manuallyStopped,
  restartCount,
  maxRestarts,
}: {
  error: SpeechRecognitionErrorCode | null;
  hasTranscript: boolean;
  manuallyStopped: boolean;
  restartCount: number;
  maxRestarts: number;
}) {
  if (hasTranscript || manuallyStopped || restartCount >= maxRestarts) return false;

  return !(
    error === "not-allowed" ||
    error === "service-not-allowed" ||
    error === "audio-capture"
  );
}

function getBrowserLanguages() {
  if (typeof navigator === "undefined") return [];

  return navigator.languages?.length
    ? navigator.languages
    : navigator.language
      ? [navigator.language]
      : [];
}
