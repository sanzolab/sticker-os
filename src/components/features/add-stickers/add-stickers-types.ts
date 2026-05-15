export type AddStickerCandidate = {
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

export type AddStickersVoiceAlternative = {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  resultIndex: number;
  alternativeIndex: number;
};

export type AddStickersVoiceSubmission = {
  transcript: string;
  finalPrimaryConfidence: {
    minimum: number;
    segmentCount: number;
  };
  audioFile: File | null;
  stopReason: string;
  reason?: string;
};

export type AddStickerUnresolved = {
  rawText: string;
  reason: string;
};

export type AddStickersAlbumPresentSlot = {
  group: string;
  number: string;
};

export type AddStickersAlbumMissingSlot = {
  group: string;
  number: string;
};

export type AddStickersAlbumUncertainSlot = {
  group: string | null;
  number: string | null;
  reason?: string;
};

export type AddStickersAlbumAnalysis = {
  status: "ok" | "needs_review";
  methodology: "missing_only_complement";
  pageType: "team" | "cc" | "fwc" | null;
  country: string | null;
  group: string | null;
  presentes: AddStickersAlbumPresentSlot[];
  faltantes: AddStickersAlbumMissingSlot[];
  uncertain: AddStickersAlbumUncertainSlot[];
  warnings: string[];
  rawModelResult: Record<string, unknown>;
};

export type AddStickersResult = {
  candidates: AddStickerCandidate[];
  unresolved: AddStickerUnresolved[];
  provider: "deterministic" | "gemini" | "openai";
  model?: string;
  source: "text" | "image" | "audio";
  meta?: {
    status?: "success" | "empty" | "timeout" | "error";
    timeout?: boolean;
    errorCode?: string;
  };
  status?: "ok" | "needs_review";
  methodology?: "missing_only_complement";
  pageType?: "team" | "cc" | "fwc" | null;
  country?: string | null;
  group?: string | null;
  presentes?: AddStickersAlbumPresentSlot[];
  faltantes?: AddStickersAlbumMissingSlot[];
  uncertain?: AddStickersAlbumUncertainSlot[];
  warnings?: string[];
  rawModelResult?: Record<string, unknown>;
};

export type AddStickersError = {
  code: string;
  message: string;
};
