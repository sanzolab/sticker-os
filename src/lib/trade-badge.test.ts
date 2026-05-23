import { describe, expect, it } from "vitest";
import { getTradeBadgeValue } from "@/lib/trade-badge";
import type { TradeSessionResult } from "@/lib/trade-session";

const mockResult: TradeSessionResult = {
  remoteName: "Collector",
  receiveIds: ["MEX1", "USA2"],
  giveIds: ["ARG3"],
};

describe("getTradeBadgeValue", () => {
  it("returns null when there is no active exchange", () => {
    expect(getTradeBadgeValue(null, [], [])).toBeNull();
  });

  it("returns an exclamation mark for active exchanges without selections", () => {
    expect(getTradeBadgeValue(mockResult, [], [])).toBe("!");
  });

  it("returns the total selected card count for active exchanges", () => {
    expect(getTradeBadgeValue(mockResult, ["MEX1", "USA2"], ["ARG3"])).toBe("3");
  });
});
