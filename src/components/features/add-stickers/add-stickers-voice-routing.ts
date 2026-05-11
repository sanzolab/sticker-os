import type { AddStickersVoiceSubmission } from "./add-stickers-types";

export function getFinalPrimaryConfidenceMinimum(
  summary: AddStickersVoiceSubmission["finalPrimaryConfidence"],
) {
  if (!summary || summary.segmentCount <= 0) return 0;
  return Number.isFinite(summary.minimum) ? summary.minimum : 0;
}

export function shouldUseDeterministicVoiceResult({
  candidatesCount,
  needsFallback,
}: {
  candidatesCount: number;
  needsFallback: boolean;
}) {
  return candidatesCount >= 1 && !needsFallback;
}
