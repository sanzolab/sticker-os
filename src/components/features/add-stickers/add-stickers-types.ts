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

export type AddStickersResult = {
  candidates: AddStickerCandidate[];
  unresolved: AddStickerUnresolved[];
  provider: "deterministic" | "gemini" | "openai";
  model?: string;
  source: "text" | "image" | "audio";
};

export type AddStickersError = {
  code: string;
  message: string;
};
