import type { TradeSessionResult } from "@/lib/trade-session";

export function getTradeBadgeValue(
  result: TradeSessionResult | null,
  selectedReceiveIds: string[],
  selectedGiveIds: string[],
) {
  if (!result) return null;

  const selectedTotal = selectedReceiveIds.length + selectedGiveIds.length;
  return selectedTotal > 0 ? String(selectedTotal) : "!";
}
