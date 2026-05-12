"use client";

import { Plus, Repeat2, Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

export type ShareState = "idle" | "copied" | "downloaded";
const TOP_BAR_HEIGHT_PX = 56;

export function TopBar({
  collectionName,
  shareState,
  pendingAddStickersCount,
  hiddenProgress = 0,
  onShare,
  onAddStickers,
  onTrade,
  onSettings,
}: {
  collectionName: string;
  shareState: ShareState;
  pendingAddStickersCount: number;
  hiddenProgress?: number;
  onShare: () => void;
  onAddStickers: () => void;
  onTrade: () => void;
  onSettings: () => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const clampedProgress = Math.min(1, Math.max(0, hiddenProgress));

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 bg-background"
      style={{
        transform: `translate3d(0, ${-TOP_BAR_HEIGHT_PX * clampedProgress}px, 0)`,
        opacity: 1 - clampedProgress * 0.18,
        willChange: "transform, opacity",
      }}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button className="inline-flex items-center gap-1 rounded-sm px-0.5 py-2 text-xl font-semibold tracking-normal transition-transform active:scale-[0.99] sm:text-2xl">
          {collectionName}
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative size-10 rounded-sm shadow-none"
            onClick={onAddStickers}
            aria-label={t(locale, "topbar.addStickersAria")}
          >
            <Plus className="size-5" />
            {pendingAddStickersCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {pendingAddStickersCount}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-sm shadow-none"
            onClick={onShare}
            aria-label={t(locale, "topbar.shareAria")}
          >
            <Share2 className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-sm shadow-none"
            onClick={onTrade}
            aria-label={t(locale, "topbar.tradeAria")}
          >
            <Repeat2 className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-sm shadow-none"
            onClick={onSettings}
            aria-label={t(locale, "topbar.settingsAria")}
          >
            <Settings className="size-5" />
          </Button>
        </div>
      </div>
      {shareState !== "idle" && (
        <div className="absolute right-14 top-12 rounded-sm border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          {shareState === "copied"
            ? t(locale, "topbar.shareStatus.copied")
            : t(locale, "topbar.shareStatus.downloaded")}
        </div>
      )}
    </header>
  );
}
