"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useElementHeight } from "@/hooks/use-element-height";
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
  activationSentinel,
  activeTab,
  query,
  sortMode,
  hiddenProgress = 0,
  isStickyActive = false,
  rootRef,
  hiddenOffsetPx,
  onQueryChange,
  onSortToggle,
  onTabChange,
}: {
  activationSentinel?: ReactNode;
  activeTab: AlbumTab;
  query: string;
  sortMode: "grouped" | "az";
  hiddenProgress?: number;
  isStickyActive?: boolean;
  rootRef?: RefObject<HTMLElement | null>;
  hiddenOffsetPx?: number;
  onQueryChange: (query: string) => void;
  onSortToggle: () => void;
  onTabChange: (tab: AlbumTab) => void;
}) {
  const internalStickyRef = useRef<HTMLElement | null>(null);
  const stickyRef = rootRef ?? internalStickyRef;
  const stickyHeight = useElementHeight({ ref: stickyRef });
  const locale = useStickerStore((state) => state.settings.locale);
  const clampedProgress = Math.min(1, Math.max(0, hiddenProgress));
  const effectiveProgress = isStickyActive ? clampedProgress : 0;
  const safeHiddenOffset = Math.max(hiddenOffsetPx ?? stickyHeight, 1);
  const shellHiddenOffset = Math.max(
    (hiddenOffsetPx ?? 0) - Math.max(stickyHeight, 1),
    0,
  );
  const tabs = useMemo(
    () =>
      albumTabs.map((tab) => ({
        id: tab.id,
        label: t(locale, tab.labelKey),
      })),
    [locale],
  );

  return (
    <>
      {activationSentinel}
      <section
        ref={stickyRef}
        className="sticky-controls-layout-slot -mx-4 sm:-mx-6 lg:-mx-8"
      >
        {isStickyActive && (
          <div
            aria-hidden="true"
            className="sticky-controls-spacer"
            style={{ height: Math.max(stickyHeight, 1) }}
          />
        )}
        <div
          className={cn(
            "sticky-controls-sticky-shell top-14 z-30 overflow-hidden",
            isStickyActive
              ? "fixed inset-x-0 mx-auto max-w-5xl"
              : "sticky",
          )}
          style={{
            transform: isStickyActive
              ? `translate3d(0, ${-shellHiddenOffset * effectiveProgress}px, 0)`
              : "none",
            transition: "none",
            willChange: isStickyActive ? "transform" : undefined,
          }}
        >
          <div
            className="sticky-controls-transform-layer bg-background px-4 pb-3 sm:px-6 lg:px-8"
            style={{
              transform: isStickyActive
                ? `translate3d(0, ${-safeHiddenOffset * effectiveProgress}px, 0)`
                : "none",
              opacity: 1,
              transition: "none",
              willChange: isStickyActive ? "transform" : undefined,
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
          </div>
        </div>
      </section>
    </>
  );
}
