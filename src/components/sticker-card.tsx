import { getVisualStateFromCopies } from "@/lib/getVisualStateFromCopies";
import { Sticker } from "@/lib/sticker-data";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import React, { memo } from "react";
import { DuplicateEditor } from "./duplicate-editor";

export const StickerCard = memo(function StickerCard({
  sticker,
}: {
  sticker: Sticker;
}) {
  const copies = useStickerStore(
    (state) => state.collectionByStickerId[sticker.id] ?? 0,
  );

  const tapSticker = useStickerStore((state) => state.tapSticker);
  const removeSticker = useStickerStore((state) => state.removeSticker);
  const animations = useStickerStore((state) => state.settings.animations);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const longPressed = React.useRef(false);

  const state = getVisualStateFromCopies(copies, sticker);

  const beginPress = () => {
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (copies === 1) removeSticker(sticker.id);
      if (copies > 1) setEditorOpen(true);
    }, 450);
  };

  const endPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleClick = () => {
    if (longPressed.current) return;
    tapSticker(sticker.id);
  };

  return (
    <>
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
          state === "owned" && "border-primary/25 bg-primary/[0.08]",
          state === "duplicate" && "border-primary/30 bg-primary/10",
          state === "special" && "border-primary/25 bg-primary/[0.08]",
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

      <DuplicateEditor
        sticker={sticker}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </>
  );
});
