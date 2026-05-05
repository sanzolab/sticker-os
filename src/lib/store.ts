"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { starterCollection, stickerGroups, stickers } from "@/lib/sticker-data";

export type ThemePreference = "system" | "light" | "dark";

export type Settings = {
  compactMode: boolean;
  animations: boolean;
  theme: ThemePreference;
};

const STORAGE_KEY = "stickeros-collection-v1";

const defaultSettings: Settings = {
  compactMode: false,
  animations: true,
  theme: "system",
};

type CollectionStats = {
  total: number;
  collected: number;
  missing: number;
  duplicateCopies: number;
  completion: number;
  specialTotal: number;
  specialCollected: number;
  teamTotal: number;
  teamCollected: number;
  shieldTotal: number;
  shieldCollected: number;
  countryTotal: number;
};

type StickerOSState = {
  version: 1;
  selectedCollection: string;
  collectionByStickerId: Record<string, number>;
  settings: Settings;
  searchQuery: string;
  hasHydrated: boolean;

  setHasHydrated: (value: boolean) => void;
  setSearchQuery: (query: string) => void;
  tapSticker: (id: string) => void;
  removeSticker: (id: string) => void;
  setStickerCopies: (id: string, copies: number) => void;
  resetCollection: () => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

export const useStickerStore = create<StickerOSState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      version: 1,
      selectedCollection: "SrickerOS",
      collectionByStickerId: starterCollection,
      settings: defaultSettings,
      searchQuery: "",

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      tapSticker: (id) =>
        set((state) => {
          const next = { ...state.collectionByStickerId };
          next[id] = (next[id] ?? 0) + 1;
          return { collectionByStickerId: next };
        }),

      removeSticker: (id) =>
        set((state) => {
          const next = { ...state.collectionByStickerId };
          delete next[id];
          return { collectionByStickerId: next };
        }),

      setStickerCopies: (id, copies) =>
        set((state) => {
          const next = { ...state.collectionByStickerId };
          if (copies <= 0) delete next[id];
          else next[id] = copies;
          return { collectionByStickerId: next };
        }),

      resetCollection: () => set({ collectionByStickerId: {} }),

      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),

      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

// ✅ Hook optimizado por sticker (gran mejora de performance)
export function useStickerCopies(id: string) {
  return useStickerStore((state) => state.collectionByStickerId[id] ?? 0);
}

// ✅ Stats estables (SIN loops)
export function useCollectionStats(): CollectionStats {
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );

  return useMemo(() => {
    const total = stickers.length;

    const collected = stickers.filter(
      (s) => (collectionByStickerId[s.id] ?? 0) > 0,
    ).length;

    const duplicateCopies = stickers.reduce(
      (sum, s) => sum + Math.max((collectionByStickerId[s.id] ?? 0) - 1, 0),
      0,
    );

    const specialTotal = stickers.filter((s) => s.special).length;

    const specialCollected = stickers.filter(
      (s) => s.special && (collectionByStickerId[s.id] ?? 0) > 0,
    ).length;

    const teamTotal = stickers.filter((s) => s.kind === "team").length;

    const teamCollected = stickers.filter(
      (s) => s.kind === "team" && (collectionByStickerId[s.id] ?? 0) > 0,
    ).length;

    const shieldTotal = stickers.filter((s) => s.kind === "shield").length;

    const shieldCollected = stickers.filter(
      (s) => s.kind === "shield" && (collectionByStickerId[s.id] ?? 0) > 0,
    ).length;

    return {
      total,
      collected,
      missing: total - collected,
      duplicateCopies,
      completion: total === 0 ? 0 : Math.round((collected / total) * 100),
      specialTotal,
      specialCollected,
      teamTotal,
      teamCollected,
      shieldTotal,
      shieldCollected,
      countryTotal: stickerGroups.filter((g) => g.category === "country")
        .length,
    };
  }, [collectionByStickerId]);
}
