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
  minimumFinalPrimaryConfidence,
  minimumConfidence = 0.7,
}: {
  candidatesCount: number;
  needsFallback: boolean;
  minimumFinalPrimaryConfidence: number;
  minimumConfidence?: number;
}) {
  return (
    candidatesCount >= 1 &&
    !needsFallback &&
    minimumFinalPrimaryConfidence >= minimumConfidence
  );
}
