"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { SpecialStickerMark } from "@/components/special-sticker-mark";
import { haptic } from "@/lib/haptic";
import { getVisualStateFromCopies } from "@/lib/getVisualStateFromCopies";
import { Sticker } from "@/lib/sticker-data";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const StickerTile = memo(function StickerTile({
  sticker,
  copies,
  animations = true,
  interactive = true,
  onTap,
  onLongPress,
}: {
  sticker: Sticker;
  copies: number;
  animations?: boolean;
  interactive?: boolean;
  onTap?: () => void;
  onLongPress?: () => void;
}) {
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
    if (!interactive) return;
    longPressed.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      longPressed.current = true;
      onLongPress?.();
    }, 450);
  }, [interactive, onLongPress]);

  const endPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (longPressed.current) return;
    onTap?.();
  }, [onTap]);

  const cellClasses = cn(
    "relative h-full w-full flex items-center justify-center text-sm font-semibold tabular-nums",
    "transition-[background-color,border-color,color,transform]",
    interactive && animations && "active:scale-[0.97]",
    !sticker.special && state === "missing" &&
      "rounded-sm border border-dashed border-muted/30 bg-transparent text-muted-foreground/40",
    !sticker.special && state === "owned" &&
      "rounded-sm border border-border/50 bg-primary/[0.06] text-foreground",
    sticker.special && state === "missing" &&
      "rounded-sm border border-dashed border-amber-500/30! bg-transparent text-muted-foreground/40",
    sticker.special && state === "owned" &&
      "rounded-sm border  border-amber-400/40! bg-amber-950/20 text-amber-300",
  );

  const cellStyle =
    sticker.special && state === "owned"
      ? { boxShadow: "0 0 0 1px rgba(251,191,36,0.15), inset 0 0 5px rgba(251,191,36,0.08)" }
      : undefined;

  const content = (
    <>
      {sticker.special && state === "owned" && (
        <div
          className="absolute inset-0 opacity-20 rounded-sm overflow-hidden pointer-events-none"
          style={{background: "radial-gradient(ellipse at 30% 20%, rgba(251,191,36,0.4) 0%, transparent 50%)" }}
        />
      )}

      <span>{sticker.number}</span>

      {state === "missing" && !sticker.special && (
        <span className="absolute bottom-[6px] md:bottom-2 size-1.5 rounded-full border" />
      )}
      {state === "missing" && sticker.special && (
        <SpecialStickerMark className="absolute bottom-[6px] md:bottom-1.5 size-2.5" />
      )}

      {copies > 1 && (
        <span className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 flex min-w-5 w-5 h-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {copies - 1}
        </span>
      )}
    </>
  );

  if (!interactive) {
    return (
      <div className="relative aspect-square p-1.5">
        <div className={cellClasses} style={cellStyle}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square p-1.5">
      <button
        type="button"
        onPointerDown={beginPress}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onPointerLeave={endPress}
        onClick={handleClick}
        className={cellClasses}
        style={cellStyle}
      >
        {content}
      </button>
    </div>
  );
});

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

  return (
    <StickerTile
      sticker={sticker}
      copies={copies}
      animations={animations}
      onTap={() => {
        if (haptics) haptic("light");
        tapSticker(sticker.id);
      }}
      onLongPress={() => {
        if (haptics) haptic("medium");
        if (copies === 1) removeSticker(sticker.id);
        if (copies > 1) onEditDuplicates(sticker);
      }}
    />
  );
});
