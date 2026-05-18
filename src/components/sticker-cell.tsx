"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { haptic } from "@/lib/haptic";
import { getVisualStateFromCopies } from "@/lib/getVisualStateFromCopies";
import { Sticker } from "@/lib/sticker-data";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const StickerCell = memo(function StickerCell({
  sticker,
  onEditDuplicates,
}: {
  sticker: Sticker;
  onEditDuplicates: (sticker: Sticker) => void;
}) {
  const copies = useStickerStore(
    (state) => state.collectionByStickerId[sticker.id] ?? 0,
  );

  const tapSticker = useStickerStore((state) => state.tapSticker);
  const removeSticker = useStickerStore((state) => state.removeSticker);
  const animations = useStickerStore((state) => state.settings.animations);
  const haptics = useStickerStore((state) => state.settings.haptics);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const state = getVisualStateFromCopies(copies);

  useEffect(
    () => () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    },
    [],
  );

  const beginPress = useCallback(() => {
    longPressed.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      longPressed.current = true;
      if (haptics) haptic("medium");
      if (copies === 1) removeSticker(sticker.id);
      if (copies > 1) onEditDuplicates(sticker);
    }, 450);
  }, [copies, haptics, onEditDuplicates, removeSticker, sticker]);

  const endPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (longPressed.current) return;
    tapSticker(sticker.id);
    if (haptics) haptic("light");
  }, [haptics, sticker.id, tapSticker]);

  return (
    <div className="relative aspect-square p-1.5">
      <button
        type="button"
        onPointerDown={beginPress}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onPointerLeave={endPress}
        onClick={handleClick}
        className={cn(
          "relative h-full w-full flex items-center justify-center text-sm font-semibold tabular-nums",
          "transition-[background-color,border-color,color,transform]",
          animations && "active:scale-[0.97]",
          !sticker.special && state === "missing" &&
            "rounded-sm border border-dashed border-muted/30 bg-transparent text-muted-foreground/40",
          !sticker.special && state === "owned" &&
            "rounded-sm border border-border/50 bg-primary/[0.06] text-foreground",
          sticker.special && state === "missing" &&
            "text-amber-500",
          sticker.special && state === "owned" &&
            "rounded-sm bg-primary/[0.06] text-amber-300/85",
        )}
    >
      {sticker.special && (
        <svg
          viewBox="0 0 100 100"
          className={cn(
            "absolute inset-0 h-full w-full",
            state === "missing" &&
              "shadow-[inset_0_1px_3px_rgba(251,191,36,0.05)]",
          )}
        >
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            rx="4"
            ry="4"
            className={cn(
              state === "missing"
                ? "fill-amber-500/[0.04] stroke-amber-400/60"
                : "fill-none stroke-amber-400/50",
            )}
            strokeWidth={2.5}
            strokeDasharray="5 3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="3"
            ry="3"
            className={cn(
              state === "missing"
                ? "stroke-amber-400/22"
                : "stroke-amber-400/18",
            )}
            fill="none"
            strokeWidth={1}
          />
        </svg>
      )}

      <span>{sticker.number}</span>

      {state === "missing" && (
        <span className="absolute bottom-[6px] md:bottom-2 size-1.5 rounded-full border" />
      )}

      {copies > 1 && (
          <span className={cn(
            "absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 flex min-w-4 h-4 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground border border-black!",
            sticker.special && "border border-dashed  border-amber-400/80!",
          )}>
          {copies - 1}
        </span>
      )}
      </button>
    </div>
  );
});
