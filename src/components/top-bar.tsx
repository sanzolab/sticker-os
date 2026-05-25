"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Plus, Repeat2, Settings, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LockButton } from "@/components/lock-button";
import {
  SCROLL_CHROME_TRANSITION,
  useDiscreteChromeHidden,
} from "@/hooks/use-discrete-chrome-hidden";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

export function TopBar({
  collectionName,
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
  const isLocked = useStickerStore((state) => state.isLocked);
  const lastBlockedAttemptAt = useStickerStore(
    (state) => state.lastBlockedAttemptAt,
  );
  const clampedProgress = Math.min(1, Math.max(0, hiddenProgress));
  const isChromeHidden = useDiscreteChromeHidden({
    hiddenProgress: clampedProgress,
    isStickyActive,
  });
  const [isTemporarilyRevealed, setIsTemporarilyRevealed] = useState(false);
  const isRevealedRef = useRef(false);
  const lastHandledAtRef = useRef<number | null>(null);
  // Effect 1: detect blocked attempt while header is hidden, trigger reveal
  useEffect(() => {
    if (!isLocked || !isChromeHidden || lastBlockedAttemptAt === null) return;
    if (lastHandledAtRef.current === lastBlockedAttemptAt) return;
    if (isRevealedRef.current) return;

    lastHandledAtRef.current = lastBlockedAttemptAt;
    isRevealedRef.current = true;

    setIsTemporarilyRevealed(true);
    toast.info(t(locale, "toast.lock.blocked"), { id: "locked-feedback" });
  }, [isLocked, isChromeHidden, lastBlockedAttemptAt, locale]);

  // Effect 2: clear reveal on next real scroll interaction
  useEffect(() => {
    if (!isTemporarilyRevealed) return;

    const handleScroll = () => {
      setIsTemporarilyRevealed(false);
      isRevealedRef.current = false;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isTemporarilyRevealed]);

  // Effect 3: clear reveal when unlocking
  useEffect(() => {
    if (!isLocked && isTemporarilyRevealed) {
      queueMicrotask(() => {
        setIsTemporarilyRevealed(false);
        isRevealedRef.current = false;
      });
    }
  }, [isLocked, isTemporarilyRevealed]);

  const shouldShowHeader = isTemporarilyRevealed || !isChromeHidden;

  const tradeBadgeDisplay = formatTradeBadgeDisplay(tradeBadgeValue);
  const tradeBadgeAriaLabel =
    tradeBadgeValue === "!"
      ? t(locale, "topbar.tradeBadge.pendingNeedsSelection")
      : t(locale, "topbar.tradeBadge.pendingCount", {
          count: tradeBadgeDisplay ?? 0,
        });

  const headerStyle: CSSProperties = isStickyActive
    ? {
        transform: shouldShowHeader
          ? "translate3d(0, 0, 0)"
          : "translate3d(0, -100%, 0)",
        opacity: 1,
        transitionProperty: "transform",
        transitionDuration: SCROLL_CHROME_TRANSITION.duration,
        transitionTimingFunction: SCROLL_CHROME_TRANSITION.timingFunction,
        transitionDelay: shouldShowHeader
          ? "0ms"
          : SCROLL_CHROME_TRANSITION.staggerDelay,
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
          <LockButton />
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
