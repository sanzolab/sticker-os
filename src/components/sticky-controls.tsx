"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { t, type TranslationKey } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

export type AlbumTab = "all" | "missing" | "duplicates" | "special";

export const albumTabs = [
  { id: "all", labelKey: "album.tab.all" },
  { id: "missing", labelKey: "album.tab.missing" },
  { id: "duplicates", labelKey: "album.tab.duplicates" },
  { id: "special", labelKey: "album.tab.special" },
] as const satisfies readonly {
  id: AlbumTab;
  labelKey: TranslationKey;
}[];

export function StickyControls({
  activeTab,
  query,
  sortMode,
  hiddenProgress = 0,
  onQueryChange,
  onSortToggle,
  onTabChange,
}: {
  activeTab: AlbumTab;
  query: string;
  sortMode: "grouped" | "az";
  hiddenProgress?: number;
  onQueryChange: (query: string) => void;
  onSortToggle: () => void;
  onTabChange: (tab: AlbumTab) => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const clampedProgress = Math.min(1, Math.max(0, hiddenProgress));
  const tabs = useMemo(
    () =>
      albumTabs.map((tab) => ({
        id: tab.id,
        label: t(locale, tab.labelKey),
      })),
    [locale],
  );

  return (
    <section
      className="sticky top-14 z-30 -mx-4 bg-background px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      style={{
        transform: `translate3d(0, calc(${-56 * clampedProgress}px - ${100 * clampedProgress}%), 0)`,
        opacity: 1 - clampedProgress * 0.14,
        willChange: "transform, opacity",
      }}
    >
      <AnimatedTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        className="grid-cols-4"
      />
      <div className="mt-3 grid grid-cols-[1fr_3.5rem] gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t(locale, "common.searchPlaceholder")}
            className="h-12 pl-10 text-base shadow-none"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-12 w-full shadow-none",
            sortMode === "az" && "border-primary/45 bg-primary/10 text-primary",
          )}
          onClick={onSortToggle}
          aria-label={
            sortMode === "grouped"
              ? t(locale, "filters.sort.alphabetical")
              : t(locale, "filters.sort.grouped")
          }
          title={
            sortMode === "grouped"
              ? t(locale, "filters.sort.alphabetical")
              : t(locale, "filters.sort.grouped")
          }
        >
          <SlidersHorizontal className="size-5" />
        </Button>
      </div>
    </section>
  );
}
