import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TradeSessionResult = {
  remoteName: string;
  receiveIds: string[];
  giveIds: string[];
};

export type TradeSessionState = {
  result: TradeSessionResult | null;
  selectedReceiveIds: string[];
  selectedGiveIds: string[];
  lastUpdatedAt: number | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setResult: (result: TradeSessionResult) => void;
  toggleReceiveId: (id: string) => void;
  toggleGiveId: (id: string) => void;
  toggleAllReceiveIds: (ids: string[]) => void;
  toggleAllGiveIds: (ids: string[]) => void;
  clearSession: () => void;
};

const TRADE_SESSION_STORAGE_KEY = "stickeros-trade-session-v1";

const defaultState = {
  result: null,
  selectedReceiveIds: [],
  selectedGiveIds: [],
  lastUpdatedAt: null,
};

const inMemoryStorage = createInMemoryStorage();

export const useTradeSessionStore = create<TradeSessionState>()(
  persist(
    (set) => ({
      ...defaultState,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setResult: (result) =>
        set({
          result,
          selectedReceiveIds: [],
          selectedGiveIds: [],
          lastUpdatedAt: Date.now(),
        }),
      toggleReceiveId: (id) =>
        set((state) => ({
          selectedReceiveIds: toggleId(state.selectedReceiveIds, id),
          lastUpdatedAt: Date.now(),
        })),
      toggleGiveId: (id) =>
        set((state) => ({
          selectedGiveIds: toggleId(state.selectedGiveIds, id),
          lastUpdatedAt: Date.now(),
        })),
      toggleAllReceiveIds: (ids) =>
        set((state) => ({
          selectedReceiveIds: toggleAllIds(state.selectedReceiveIds, ids),
          lastUpdatedAt: Date.now(),
        })),
      toggleAllGiveIds: (ids) =>
        set((state) => ({
          selectedGiveIds: toggleAllIds(state.selectedGiveIds, ids),
          lastUpdatedAt: Date.now(),
        })),
      clearSession: () => set({ ...defaultState }),
    }),
    {
      name: TRADE_SESSION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") return inMemoryStorage;
        return window.localStorage;
      }),
      partialize: (state) => ({
        result: state.result,
        selectedReceiveIds: state.selectedReceiveIds,
        selectedGiveIds: state.selectedGiveIds,
        lastUpdatedAt: state.lastUpdatedAt,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TradeSessionState> | undefined;

        return {
          ...currentState,
          result: sanitizeResult(persisted?.result),
          selectedReceiveIds: sanitizeIds(persisted?.selectedReceiveIds),
          selectedGiveIds: sanitizeIds(persisted?.selectedGiveIds),
          lastUpdatedAt:
            typeof persisted?.lastUpdatedAt === "number"
              ? persisted.lastUpdatedAt
              : null,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function toggleId(ids: string[], id: string) {
  return ids.includes(id)
    ? ids.filter((candidate) => candidate !== id)
    : [...ids, id];
}

export function toggleAllIds(selectedIds: string[], ids: string[]) {
  if (ids.length === 0) return [];

  const selected = new Set(selectedIds);
  const allSelected = ids.every((id) => selected.has(id));

  return allSelected ? [] : [...ids];
}

function sanitizeResult(value: unknown): TradeSessionResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const result = value as Partial<TradeSessionResult>;
  if (
    typeof result.remoteName !== "string" ||
    !Array.isArray(result.receiveIds) ||
    !Array.isArray(result.giveIds)
  ) {
    return null;
  }

  return {
    remoteName: result.remoteName,
    receiveIds: sanitizeIds(result.receiveIds),
    giveIds: sanitizeIds(result.giveIds),
  };
}

function sanitizeIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter((id): id is string => typeof id === "string");
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
