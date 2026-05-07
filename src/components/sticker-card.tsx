"use client";

import { getVisualStateFromCopies } from "@/lib/getVisualStateFromCopies";
import { Sticker } from "@/lib/sticker-data";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useRef } from "react";

export const StickerCard = memo(function StickerCard({
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

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const state = getVisualStateFromCopies(copies, sticker);

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
      if (copies === 1) removeSticker(sticker.id);
      if (copies > 1) onEditDuplicates(sticker);
    }, 450);
  }, [copies, onEditDuplicates, removeSticker, sticker]);

  const endPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (longPressed.current) return;
    tapSticker(sticker.id);
  }, [sticker.id, tapSticker]);

  return (
    <button
      type="button"
      onPointerDown={beginPress}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={endPress}
      onClick={handleClick}
      className={cn(
        "relative flex aspect-[3/4.35] items-center justify-center rounded-sm border text-2xl font-medium",
        "transition-[background-color,border-color,color,transform]",
        animations && "active:scale-[0.97]",
        state === "missing" &&
          "border-dashed border-border/70 bg-background text-muted-foreground/70",
        state === "owned" && "border-primary/25 bg-primary/20",
        state === "duplicate" && "border-primary/30 bg-primary/25",
        state === "special" && "border-primary/25 bg-primary/20",
      )}
    >
      {sticker.special && (
        <span className="absolute right-3 top-3 text-yellow-400">✨</span>
      )}

      <span>{sticker.number}</span>

      {state === "missing" && (
        <span className="absolute bottom-5 size-2 rounded-full border" />
      )}

      {copies > 1 && (
        <span className="absolute bottom-4 right-3 text-xs">
          x{copies - 1}
        </span>
      )}
    </button>
  );
});
