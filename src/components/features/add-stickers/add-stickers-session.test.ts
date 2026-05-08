import { beforeEach, describe, expect, it } from "vitest";
import {
  hasPendingItems,
  mergeAddStickerCandidates,
  useAddStickersPendingStore,
} from "./add-stickers-session";
import type {
  AddStickerCandidate,
  AddStickersResult,
  AddStickerUnresolved,
} from "./add-stickers-types";

beforeEach(() => {
  useAddStickersPendingStore.getState().clearPending();
  useAddStickersPendingStore.persist.clearStorage();
});

describe("mergeAddStickerCandidates", () => {
  it("keeps an existing selected candidate selected", () => {
    const result = mergeAddStickerCandidates(
      {
        candidates: [candidate("MEX13", "MEX 13", true)],
        unresolved: [],
      },
      {
        candidates: [candidate("MEX13", "MEX 13", false)],
        unresolved: [],
      },
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.selected).toBe(true);
  });

  it("keeps an existing unselected candidate unselected", () => {
    const result = mergeAddStickerCandidates(
      {
        candidates: [candidate("MEX13", "MEX 13", false)],
        unresolved: [],
      },
      {
        candidates: [candidate("MEX13", "MEX 13", true)],
        unresolved: [],
      },
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.selected).toBe(false);
  });

  it("does not duplicate incoming candidates with the same sticker id", () => {
    const result = mergeAddStickerCandidates(
      {
        candidates: [candidate("MEX13", "MEX 13", true)],
        unresolved: [],
      },
      {
        candidates: [candidate("MEX13", "MEX 13", true)],
        unresolved: [],
      },
    );

    expect(result.candidates.map((item) => item.stickerId)).toEqual(["MEX13"]);
  });

  it("adds new candidates selected by their incoming default", () => {
    const result = mergeAddStickerCandidates(
      {
        candidates: [candidate("MEX13", "MEX 13", true)],
        unresolved: [],
      },
      {
        candidates: [candidate("CC14", "CC 14", true)],
        unresolved: [],
      },
    );

    expect(result.candidates.map((item) => [item.stickerId, item.selected])).toEqual([
      ["MEX13", true],
      ["CC14", true],
    ]);
  });

  it("merges candidates from multiple sources", () => {
    const afterPhoto = mergeAddStickerCandidates(
      {
        candidates: [candidate("MEX13", "MEX 13", true)],
        unresolved: [],
      },
      {
        candidates: [candidate("CC14", "CC 14", true)],
        unresolved: [],
      },
    );
    const afterAudio = mergeAddStickerCandidates(afterPhoto, {
      candidates: [candidate("FWC00", "FWC 00", true)],
      unresolved: [],
    });

    expect(afterAudio.candidates.map((item) => item.code)).toEqual([
      "MEX 13",
      "CC 14",
      "FWC 00",
    ]);
  });

  it("does not duplicate unresolved items", () => {
    const unresolved: AddStickerUnresolved = {
      rawText: "sticker 13",
      reason: "Missing group/team",
    };

    const result = mergeAddStickerCandidates(
      {
        candidates: [],
        unresolved: [unresolved],
      },
      {
        candidates: [],
        unresolved: [
          unresolved,
          { rawText: "Sticker 13", reason: "missing group team" },
        ],
      },
    );

    expect(result.unresolved).toEqual([unresolved]);
  });
});

describe("useAddStickersPendingStore", () => {
  it("appends and merges candidates while preserving selection state", () => {
    const store = useAddStickersPendingStore.getState();

    store.appendResult(result([candidate("MEX13", "MEX 13", true)], [], "deterministic"));
    store.toggleCandidate("MEX13");
    store.appendResult(result([candidate("MEX13", "MEX 13", true)], [], "deterministic"));
    store.appendResult(result([candidate("CC14", "CC 14", true)], [], "deterministic"));

    const pending = useAddStickersPendingStore.getState();
    expect(pending.candidates.map((item) => [item.stickerId, item.selected])).toEqual([
      ["MEX13", false],
      ["CC14", true],
    ]);
  });

  it("confirms selected stickers and clears the pending queue", () => {
    const store = useAddStickersPendingStore.getState();

    store.appendResult(result([
      candidate("MEX13", "MEX 13", true),
      candidate("CC14", "CC 14", false),
    ], [], "deterministic"));

    const selected = useAddStickersPendingStore.getState().confirmAndConsume();
    const afterConfirm = useAddStickersPendingStore.getState();

    expect(selected.map((item) => item.stickerId)).toEqual(["MEX13"]);
    expect(afterConfirm.candidates).toEqual([]);
    expect(afterConfirm.unresolved).toEqual([]);
    expect(afterConfirm.source.provider).toBeNull();
  });

  it("clears pending queue without confirming", () => {
    const store = useAddStickersPendingStore.getState();

    store.appendResult(result([candidate("MEX13", "MEX 13", true)], [], "gemini"));
    store.clearPending();

    const pending = useAddStickersPendingStore.getState();
    expect(pending.candidates).toEqual([]);
    expect(pending.unresolved).toEqual([]);
    expect(pending.source).toEqual({ provider: null, mixed: false });
  });

  it("downgrades source metadata to mixed when results come from different providers", () => {
    const store = useAddStickersPendingStore.getState();

    store.appendResult(result([candidate("MEX13", "MEX 13", true)], [], "deterministic"));
    store.appendResult(result([candidate("CC14", "CC 14", true)], [], "gemini", "gemini-model"));

    const pending = useAddStickersPendingStore.getState();
    expect(pending.source).toEqual({
      provider: null,
      mixed: true,
      model: undefined,
    });
  });
});

describe("hasPendingItems", () => {
  it("detects candidates or unresolved entries", () => {
    expect(hasPendingItems({ candidates: [candidate("MEX13", "MEX 13", true)], unresolved: [] })).toBe(true);
    expect(
      hasPendingItems({
        candidates: [],
        unresolved: [{ rawText: "unknown", reason: "reason" }],
      }),
    ).toBe(true);
    expect(hasPendingItems({ candidates: [], unresolved: [] })).toBe(false);
  });
});

function result(
  candidates: AddStickerCandidate[],
  unresolved: AddStickerUnresolved[],
  provider: AddStickersResult["provider"],
  model?: string,
): AddStickersResult {
  return {
    candidates,
    unresolved,
    provider,
    model,
    source: "text",
  };
}

function candidate(
  stickerId: string,
  code: string,
  selected: boolean,
): AddStickerCandidate {
  return {
    stickerId,
    stickerOsIndex: Number(code.replace(/\D/g, "")),
    code,
    label: code,
    groupLabel: code.split(" ")[0] ?? code,
    number: code.split(" ")[1] ?? "",
    confidence: 1,
    selected,
    source: code,
  };
}
