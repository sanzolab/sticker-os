"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Locale } from "@/lib/locale-meta";
import { defaultLocale } from "@/lib/locale-meta";
import {
  normalizeLocale,
  normalizeLocaleSource,
  type LocaleSource,
} from "@/lib/locale";
import { starterCollection, stickerGroups, stickers } from "@/lib/sticker-data";
import {
  applyTradeToCollection,
  canApplyTrade,
  type ApplyTradeResult,
} from "@/lib/trade";

export type ThemePreference = "system" | "light" | "dark";

export type Settings = {
  animations: boolean;
  haptics: boolean;
  theme: ThemePreference;
  locale: Locale;
  localeSource: LocaleSource;
};

const STORAGE_KEY = "stickeros-collection-v1";

const FALLBACK_LOCALE_SOURCE: LocaleSource = "auto";

let initialLocalePreference: { locale: Locale; source: LocaleSource } = {
  locale: defaultLocale,
  source: FALLBACK_LOCALE_SOURCE,
};

function createDefaultSettings(): Settings {
  return {
    animations: true,
    haptics: true,
    theme: "system",
    locale: initialLocalePreference.locale,
    localeSource: initialLocalePreference.source,
  };
}

export function setInitialLocalePreference(locale: Locale, source: LocaleSource) {
  initialLocalePreference = { locale, source };
}

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
  localShareId?: string;
  localShareSecret?: string;

  setHasHydrated: (value: boolean) => void;
  setSearchQuery: (query: string) => void;
  tapSticker: (id: string) => void;
  removeSticker: (id: string) => void;
  setStickerCopies: (id: string, copies: number) => void;
  setCollectionByStickerId: (collectionByStickerId: Record<string, number>) => void;
  applyTrade: (receiveIds: string[], giveIds: string[]) => ApplyTradeResult;
  resetCollection: () => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setLocalePreference: (locale: Locale, source: LocaleSource) => void;
  setLocalShareId: (id: string, secret: string) => void;
};

export const useStickerStore = create<StickerOSState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      version: 1,
      selectedCollection: "SrickerOS",
      collectionByStickerId: starterCollection,
      settings: createDefaultSettings(),
      searchQuery: "",
      localShareId: undefined,
      localShareSecret: undefined,

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

      setCollectionByStickerId: (collectionByStickerId) =>
        set((state) => ({
          collectionByStickerId: sanitizeCollection(
            collectionByStickerId,
            state.collectionByStickerId,
          ),
        })),

      applyTrade: (receiveIds, giveIds) => {
        let tradeResult: ApplyTradeResult = {
          ok: false,
          reason: "invalid-selection",
        };

        set((state) => {
          tradeResult = canApplyTrade(
            state.collectionByStickerId,
            receiveIds,
            giveIds,
          );

          if (!tradeResult.ok) return state;

          return {
            collectionByStickerId: applyTradeToCollection(
              state.collectionByStickerId,
              receiveIds,
              giveIds,
            ),
          };
        });

        return tradeResult;
      },

      resetCollection: () => set({ collectionByStickerId: {} }),

      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),

      setLocalePreference: (locale, source) =>
        set((state) => ({
          settings: { ...state.settings, locale, localeSource: source },
        })),

      setLocalShareId: (id, secret) =>
        set({ localShareId: id, localShareSecret: secret }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<StickerOSState> | undefined;

        return {
          ...currentState,
          ...persisted,
          collectionByStickerId: sanitizeCollection(
            persisted?.collectionByStickerId,
            currentState.collectionByStickerId,
          ),
          settings: resolveMergedSettings(
            persisted?.settings,
            currentState.settings,
          ),
          localShareId:
            persisted?.localShareId &&
            typeof persisted.localShareId === "string"
              ? persisted.localShareId
              : undefined,
          localShareSecret:
            persisted?.localShareSecret &&
            typeof persisted.localShareSecret === "string"
              ? persisted.localShareSecret
              : undefined,
        };
      },

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

const MAX_STICKER_COPIES = 999;

function sanitizeCollection(
  persisted: unknown,
  fallback: Record<string, number>,
): Record<string, number> {
  if (!persisted || typeof persisted !== "object" || Array.isArray(persisted)) {
    return fallback;
  }

  const sanitized: Record<string, number> = {};

  for (const [key, value] of Object.entries(
    persisted as Record<string, unknown>,
  )) {
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= MAX_STICKER_COPIES
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function resolveMergedSettings(
  persistedSettings: Partial<Settings> | undefined,
  currentSettings: Settings,
): Settings {
  const nextSettings: Settings = {
    ...currentSettings,
    animations:
      typeof persistedSettings?.animations === "boolean"
        ? persistedSettings.animations
        : currentSettings.animations,
    haptics:
      typeof persistedSettings?.haptics === "boolean"
        ? persistedSettings.haptics
        : currentSettings.haptics,
    theme: isThemePreference(persistedSettings?.theme)
      ? persistedSettings.theme
      : currentSettings.theme,
  };

  const persistedLocale = normalizeLocale(persistedSettings?.locale);
  if (!persistedLocale) {
    return nextSettings;
  }

  return {
    ...nextSettings,
    locale: persistedLocale,
    localeSource: normalizeLocaleSource(persistedSettings?.localeSource)
      ?? "persisted",
  };
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
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
