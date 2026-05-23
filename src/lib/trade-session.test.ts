import { beforeEach, describe, expect, it } from "vitest";
import { toggleAllIds, useTradeSessionStore } from "@/lib/trade-session";

describe("trade session store", () => {
  beforeEach(() => {
    useTradeSessionStore.getState().clearSession();
  });

  it("stores scanned results and starts with no selections", () => {
    useTradeSessionStore.getState().setResult({
      remoteName: "Collector",
      receiveIds: ["MEX1", "USA2"],
      giveIds: ["ARG3"],
    });

    expect(useTradeSessionStore.getState().result).toEqual({
      remoteName: "Collector",
      receiveIds: ["MEX1", "USA2"],
      giveIds: ["ARG3"],
    });
    expect(useTradeSessionStore.getState().selectedReceiveIds).toEqual([]);
    expect(useTradeSessionStore.getState().selectedGiveIds).toEqual([]);
  });

  it("toggles individual selections", () => {
    const store = useTradeSessionStore.getState();

    store.toggleReceiveId("MEX1");
    store.toggleGiveId("ARG3");

    expect(useTradeSessionStore.getState().selectedReceiveIds).toEqual(["MEX1"]);
    expect(useTradeSessionStore.getState().selectedGiveIds).toEqual(["ARG3"]);

    useTradeSessionStore.getState().toggleReceiveId("MEX1");
    expect(useTradeSessionStore.getState().selectedReceiveIds).toEqual([]);
  });

  it("selects all ids and clears them when all are selected", () => {
    expect(toggleAllIds([], ["MEX1", "USA2"])).toEqual(["MEX1", "USA2"]);
    expect(toggleAllIds(["MEX1", "USA2"], ["MEX1", "USA2"])).toEqual([]);
  });

  it("clears the exchange session", () => {
    const store = useTradeSessionStore.getState();
    store.setResult({
      remoteName: "Collector",
      receiveIds: ["MEX1"],
      giveIds: ["ARG3"],
    });
    store.toggleReceiveId("MEX1");
    store.clearSession();

    expect(useTradeSessionStore.getState().result).toBeNull();
    expect(useTradeSessionStore.getState().selectedReceiveIds).toEqual([]);
    expect(useTradeSessionStore.getState().selectedGiveIds).toEqual([]);
  });
});
