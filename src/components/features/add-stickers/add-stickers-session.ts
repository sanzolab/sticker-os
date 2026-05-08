import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AddStickerCandidate,
  AddStickerUnresolved,
  AddStickersResult,
} from "./add-stickers-types";

type PendingSource = {
  provider: AddStickersResult["provider"] | null;
  model?: string;
  mixed: boolean;
};

export type AddStickersPendingState = {
  candidates: AddStickerCandidate[];
  unresolved: AddStickerUnresolved[];
  source: PendingSource;
  lastUpdatedAt: number | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  appendResult: (incoming: AddStickersResult) => void;
  toggleCandidate: (id: string) => void;
  clearPending: () => void;
  confirmAndConsume: () => AddStickerCandidate[];
};

const PENDING_STORAGE_KEY = "stickeros-add-stickers-pending-v1";

const defaultPendingSource: PendingSource = {
  provider: null,
  mixed: false,
};

const defaultState = {
  candidates: [],
  unresolved: [],
  source: defaultPendingSource,
  lastUpdatedAt: null,
};

const inMemoryStorage = createInMemoryStorage();

export const useAddStickersPendingStore = create<AddStickersPendingState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      appendResult: (incoming) =>
        set((state) => {
          const merged = mergeAddStickerCandidates(state, incoming);
          return {
            ...state,
            ...merged,
            source: mergePendingSource(state.source, incoming),
            lastUpdatedAt: Date.now(),
          };
        }),
      toggleCandidate: (id) =>
        set((state) => ({
          ...state,
          candidates: state.candidates.map((candidate) =>
            candidate.stickerId === id
              ? { ...candidate, selected: !candidate.selected }
              : candidate,
          ),
        })),
      clearPending: () =>
        set((state) => ({
          ...state,
          ...defaultState,
        })),
      confirmAndConsume: () => {
        const selected = get().candidates.filter((candidate) => candidate.selected);
        set((state) => ({
          ...state,
          ...defaultState,
        }));
        return selected;
      },
    }),
    {
      name: PENDING_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") return inMemoryStorage;
        return window.localStorage;
      }),
      partialize: (state) => ({
        candidates: state.candidates,
        unresolved: state.unresolved,
        source: state.source,
        lastUpdatedAt: state.lastUpdatedAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function hasPendingItems({
  candidates,
  unresolved,
}: {
  candidates: AddStickerCandidate[];
  unresolved: AddStickerUnresolved[];
}) {
  return candidates.length > 0 || unresolved.length > 0;
}

function mergePendingSource(
  existing: PendingSource,
  incoming: Pick<AddStickersResult, "provider" | "model">,
): PendingSource {
  if (!existing.provider) {
    return {
      provider: incoming.provider,
      model: incoming.model,
      mixed: false,
    };
  }

  const incomingModel = incoming.model ?? "";
  const existingModel = existing.model ?? "";
  const changedProvider = existing.provider !== incoming.provider;
  const changedModel = incomingModel !== existingModel;
  const mixed = existing.mixed || changedProvider || changedModel;

  if (!mixed) {
    return existing;
  }

  return {
    provider: null,
    model: undefined,
    mixed: true,
  };
}

function createInMemoryStorage() {
  const memory = new Map<string, string>();
  return {
    getItem: (name: string) => memory.get(name) ?? null,
    setItem: (name: string, value: string) => {
      memory.set(name, value);
    },
    removeItem: (name: string) => {
      memory.delete(name);
    },
  };
}

export function mergeAddStickerCandidates(
  existing: {
    candidates: AddStickerCandidate[];
    unresolved: AddStickerUnresolved[];
  },
  incoming: {
    candidates: AddStickerCandidate[];
    unresolved: AddStickerUnresolved[];
  },
) {
  const candidates = [...existing.candidates];
  const candidateIndexByKey = new Map(
    candidates.map((candidate, index) => [getCandidateKey(candidate), index]),
  );

  for (const candidate of incoming.candidates) {
    const key = getCandidateKey(candidate);
    const existingIndex = candidateIndexByKey.get(key);

    if (existingIndex === undefined) {
      candidateIndexByKey.set(key, candidates.length);
      candidates.push(candidate);
      continue;
    }

    const existingCandidate = candidates[existingIndex];
    candidates[existingIndex] = {
      ...candidate,
      selected: existingCandidate?.selected ?? candidate.selected,
    };
  }

  const unresolved = [...existing.unresolved];
  const unresolvedKeys = new Set(unresolved.map(getUnresolvedKey));

  for (const item of incoming.unresolved) {
    const key = getUnresolvedKey(item);
    if (unresolvedKeys.has(key)) continue;

    unresolvedKeys.add(key);
    unresolved.push(item);
  }

  return {
    candidates,
    unresolved,
  };
}

function getCandidateKey(candidate: AddStickerCandidate) {
  return candidate.stickerId || String(candidate.stickerOsIndex);
}

function getUnresolvedKey(item: AddStickerUnresolved) {
  return `${normalizeUnresolvedText(item.rawText)}:${normalizeUnresolvedText(item.reason)}`;
}

function normalizeUnresolvedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
