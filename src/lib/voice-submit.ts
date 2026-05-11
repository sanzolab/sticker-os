import { parseVoiceTranscriptDeterministically, toParseCandidate } from "@/lib/ai/deterministic";
import { useAddStickersPendingStore } from "@/components/features/add-stickers/add-stickers-session";
import type {
  AddStickersResult,
  AddStickersError,
  AddStickersVoiceSubmission,
} from "@/components/features/add-stickers/add-stickers-types";
import type { Locale } from "@/lib/i18n";

const TRANSCRIPTION_ERROR_MESSAGES: Record<string, (locale: Locale) => string> = {
  empty: () => "No speech detected. Try speaking again.",
  offline: () => "You are offline. Connect to the internet to use voice recognition.",
  connection: () => "Connection error. Please try again.",
};

export async function analyzeVoiceSubmission(
  locale: Locale,
  submission: AddStickersVoiceSubmission,
): Promise<{ ok: boolean; message?: string }> {
  const transcript = submission.transcript.trim();
  const isBackendOnly = submission.reason === "local-engine-fail";

  if (!transcript && !submission.audioFile) {
    return { ok: false, message: TRANSCRIPTION_ERROR_MESSAGES.empty(locale) };
  }

  const localResult = transcript
    ? parseVoiceTranscriptDeterministically(transcript)
    : null;
  const hasLocalCandidates = localResult && localResult.candidates.length > 0;

  if (hasLocalCandidates) {
    mergeResult({
      candidates: localResult.candidates.map(toParseCandidate),
      unresolved: localResult.unresolved.map((u) => ({
        rawText: u.rawText,
        reason: u.reason,
      })),
      provider: "deterministic",
      source: "text",
    });
    return { ok: true };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, message: TRANSCRIPTION_ERROR_MESSAGES.offline(locale) };
  }

  if (isBackendOnly && submission.audioFile) {
    const result = await requestAnalysisResult(locale, () => {
      const audioFile = submission.audioFile;
      if (!audioFile) {
        throw new Error("Missing voice audio file");
      }
      const formData = new FormData();
      formData.append("type", "audio");
      formData.append("provider", "gemini");
      formData.append("file", audioFile, audioFile.name);
      formData.append("reason", "local-engine-fail");

      return fetch("/api/ai/parse-stickers", {
        method: "POST",
        body: formData,
      });
    });

    if (!result.ok) {
      return { ok: false, message: result.error.message };
    }

    mergeResult(result.result);
    return { ok: true };
  }

  if (transcript) {
    const result = await requestAnalysisResult(locale, () =>
      fetch("/api/ai/parse-stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          source: "voice-transcript",
          text: transcript,
        }),
      }),
    );

    if (!result.ok) {
      return { ok: false, message: result.error.message };
    }

    mergeResult(result.result);
    return { ok: true };
  }

  return { ok: false, message: TRANSCRIPTION_ERROR_MESSAGES.empty(locale) };
}

async function requestAnalysisResult(
  locale: Locale,
  request: () => Promise<Response>,
): Promise<
  | { ok: true; result: AddStickersResult }
  | { ok: false; error: AddStickersError }
> {
  try {
    const response = await request();
    const body = (await response.json()) as AddStickersResult | AddStickersError;

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "code" in body ? body.code : "AI_PROVIDER_ERROR",
          message: "message" in body ? body.message : "Something went wrong",
        },
      };
    }

    return { ok: true, result: body as AddStickersResult };
  } catch {
    return {
      ok: false,
      error: {
        code: "AI_PROVIDER_ERROR",
        message: TRANSCRIPTION_ERROR_MESSAGES.connection(locale),
      },
    };
  }
}

function mergeResult(nextResult: AddStickersResult) {
  useAddStickersPendingStore.getState().appendResult(nextResult);
}
