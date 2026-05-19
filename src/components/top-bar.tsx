"use client";

import { useRef, type CSSProperties, type RefObject } from "react";
import { Plus, Repeat2, Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SCROLL_CHROME_TRANSITION,
  useDiscreteChromeHidden,
} from "@/hooks/use-discrete-chrome-hidden";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

export type ShareState = "idle" | "copied" | "downloaded";

export function TopBar({
  collectionName,
  shareState,
  pendingAddStickersCount,
  tradeBadgeValue = null,
  hiddenProgress = 0,
  isStickyActive = false,
  rootRef,
  onShare,
  onAddStickers,
  onTrade,
  onSettings,
}: {
  collectionName: string;
  shareState: ShareState;
  pendingAddStickersCount: number;
  tradeBadgeValue?: string | null;
  hiddenProgress?: number;
  isStickyActive?: boolean;
  rootRef?: RefObject<HTMLElement | null>;
  onShare: () => void;
  onAddStickers: () => void;
  onTrade: () => void;
  onSettings: () => void;
}) {
  const internalHeaderRef = useRef<HTMLElement | null>(null);
  const headerRef = rootRef ?? internalHeaderRef;
  const locale = useStickerStore((state) => state.settings.locale);
  const clampedProgress = Math.min(1, Math.max(0, hiddenProgress));
  const isChromeHidden = useDiscreteChromeHidden({
    hiddenProgress: clampedProgress,
    isStickyActive,
  });
  const tradeBadgeDisplay = formatTradeBadgeDisplay(tradeBadgeValue);
  const tradeBadgeAriaLabel =
    tradeBadgeValue === "!"
      ? t(locale, "topbar.tradeBadge.pendingNeedsSelection")
      : t(locale, "topbar.tradeBadge.pendingCount", {
          count: tradeBadgeDisplay ?? 0,
        });

  const headerStyle: CSSProperties = isStickyActive
    ? {
        transform: isChromeHidden
          ? "translate3d(0, -100%, 0)"
          : "translate3d(0, 0, 0)",
        opacity: 1,
        transitionProperty: "transform",
        transitionDuration: SCROLL_CHROME_TRANSITION.duration,
        transitionTimingFunction: SCROLL_CHROME_TRANSITION.timingFunction,
        transitionDelay: isChromeHidden
          ? SCROLL_CHROME_TRANSITION.staggerDelay
          : "0ms",
        willChange: "transform",
      }
    : {
        transform: "none",
        opacity: 1,
        transition: "none",
      };

  return (
    <header
      ref={headerRef}
      className="safe-top fixed inset-x-0 top-0 z-40 bg-background"
      style={headerStyle}
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
            className="relative size-10 rounded-sm shadow-none"
            onClick={onTrade}
            aria-label={t(locale, "topbar.tradeAria")}
          >
            <Repeat2 className="size-5" />
            {tradeBadgeDisplay && (
              <span
                className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background"
                aria-label={tradeBadgeAriaLabel}
              >
                {tradeBadgeDisplay}
              </span>
            )}
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
        <div className="absolute right-14 top-full mt-2 rounded-sm border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          {shareState === "copied"
            ? t(locale, "topbar.shareStatus.copied")
            : t(locale, "topbar.shareStatus.downloaded")}
        </div>
      )}
    </header>
  );
}

function formatTradeBadgeDisplay(value: string | null | undefined) {
  if (!value) return null;
  if (value === "!") return "!";

  const numericValue = Number.parseInt(value, 10);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  if (numericValue > 99) return "99+";

  return String(numericValue);
}
