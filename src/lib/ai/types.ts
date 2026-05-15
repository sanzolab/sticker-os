import type { Sticker } from "@/lib/sticker-data";

export type AiInputType = "text" | "image" | "audio";

export type AiProviderName = "deterministic" | "gemini" | "openai";

export type AiErrorCode =
  | "AI_EMPTY_INPUT"
  | "AI_UNSUPPORTED_INPUT_TYPE"
  | "AI_FILE_TOO_LARGE"
  | "AI_UNSUPPORTED_MIME_TYPE"
  | "AI_PROVIDER_NOT_CONFIGURED"
  | "AI_PROVIDER_ERROR"
  | "AI_INVALID_MODEL_RESPONSE"
  | "AI_NO_STICKERS_FOUND"
  | "AI_TIMEOUT_ERROR";

export type ParseStickersInput =
  | {
      type: "text";
      text: string;
      source?: "manual" | "voice-transcript";
      provider?: AiProviderName;
    }
  | {
      type: "image" | "audio";
      file: {
        data: ArrayBuffer;
        mimeType: string;
        name?: string;
      };
      provider?: AiProviderName;
      reason?: string;
    };

export type ModelStickerSuggestion = {
  rawText?: string;
  code?: string;
  group?: string;
  number?: string;
  confidence?: number;
  visualEvidence?: string;
};

export type ModelUnresolvedSuggestion = {
  rawText?: string;
  reason?: string;
};

export type ModelParseResult = {
  stickers: ModelStickerSuggestion[];
  unresolved: ModelUnresolvedSuggestion[];
};

export type ParseStickerCandidate = {
  stickerId: string;
  stickerOsIndex: number;
  code: string;
  label: string;
  groupLabel: string;
  number: string;
  confidence: number;
  selected: boolean;
  source: string;
};

export type ParseStickerUnresolved = {
  rawText: string;
  reason: string;
};

export type ParseStickersResult = {
  candidates: ParseStickerCandidate[];
  unresolved: ParseStickerUnresolved[];
  provider: AiProviderName;
  model?: string;
  source: AiInputType;
  meta?: {
    status?: "success" | "empty" | "timeout" | "error";
    timeout?: boolean;
    errorCode?: string;
  };
  pageType?: "team" | "cc" | "fwc" | null;
  presentes?: { group: string; number: string }[];
  faltantes?: { group: string; number: string }[];
  uncertain?: { group: string | null; number: string | null; reason?: string }[];
  status?: "ok" | "needs_review";
  methodology?: "missing_only_complement";
  country?: string | null;
  group?: string | null;
  warnings?: string[];
  rawModelResult?: Record<string, unknown>;
};

export type ResolvedStickerCandidate = {
  sticker: Sticker;
  confidence: number;
  source: string;
};

export class AiParseError extends Error {
  code: AiErrorCode;
  status: number;

  constructor(code: AiErrorCode, message: string, status = 400) {
    super(message);
    this.name = "AiParseError";
    this.code = code;
    this.status = status;
  }
}
