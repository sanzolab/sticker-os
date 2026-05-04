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

type StickerOSState = {
  version: 1;
  selectedCollection: string;
  collectionByStickerId: Record<string, number>;
  settings: Settings;
  searchQuery: string;
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
      version: 1,
      selectedCollection: "SrickerOS",
      collectionByStickerId: starterCollection,
      searchQuery: "",
      settings: {
        compactMode: false,
        animations: true,
        theme: "dark",
      },
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      tapSticker: (id) =>
        set((state) => ({
          collectionByStickerId: {
            ...state.collectionByStickerId,
            [id]: (state.collectionByStickerId[id] ?? 0) + 1,
          },
        })),
      removeSticker: (id) =>
        set((state) => {
          const nextCollection = { ...state.collectionByStickerId };
          delete nextCollection[id];
          return { collectionByStickerId: nextCollection };
        }),
      setStickerCopies: (id, copies) =>
        set((state) => {
          const nextCollection = { ...state.collectionByStickerId };
          if (copies <= 0) delete nextCollection[id];
          else nextCollection[id] = copies;
          return { collectionByStickerId: nextCollection };
        }),
      resetCollection: () => set({ collectionByStickerId: {} }),
      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
    }),
    {
      name: "stickeros-collection-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        version: state.version,
        selectedCollection: state.selectedCollection,
        collectionByStickerId: state.collectionByStickerId,
        settings: state.settings,
        searchQuery: state.searchQuery,
      }),
    },
  ),
);

export function useCollectionStats() {
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );

  return useMemo(() => {
    const total = stickers.length;
    const collected = stickers.filter(
      (sticker) => (collectionByStickerId[sticker.id] ?? 0) > 0,
    ).length;
    const duplicateCopies = stickers.reduce(
      (sum, sticker) =>
        sum + Math.max((collectionByStickerId[sticker.id] ?? 0) - 1, 0),
      0,
    );
    const specialTotal = stickers.filter((sticker) => sticker.special).length;
    const specialCollected = stickers.filter(
      (sticker) =>
        sticker.special && (collectionByStickerId[sticker.id] ?? 0) > 0,
    ).length;
    const teamTotal = stickers.filter(
      (sticker) => sticker.kind === "team",
    ).length;
    const teamCollected = stickers.filter(
      (sticker) =>
        sticker.kind === "team" && (collectionByStickerId[sticker.id] ?? 0) > 0,
    ).length;
    const shieldTotal = stickers.filter(
      (sticker) => sticker.kind === "shield",
    ).length;
    const shieldCollected = stickers.filter(
      (sticker) =>
        sticker.kind === "shield" &&
        (collectionByStickerId[sticker.id] ?? 0) > 0,
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
      countryTotal: stickerGroups.filter(
        (group) => group.category === "country",
      ).length,
    };
  }, [collectionByStickerId]);
}
