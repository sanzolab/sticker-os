"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SpecialStickerMark } from "@/components/special-sticker-mark";
import { haptic } from "@/lib/haptic";
import { t, type Locale } from "@/lib/i18n";
import { getVisualStateFromCopies } from "@/lib/getVisualStateFromCopies";
import { getCompactStickerCode, Sticker } from "@/lib/sticker-data";
import {
  STICKER_QUANTITY_ADD_UNDO_TOAST_ID,
  STICKER_QUANTITY_REMOVE_UNDO_TOAST_ID,
  withStickerQuantityUndoToast,
} from "@/lib/sticker-quantity-toast";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useGuardedAction } from "@/hooks/use-guarded-action";

const stickerCodeToken = "__STICKER_CODE__";

const stickerTileClasses = {
  missing:
    "rounded-sm border border-dashed !border-muted-foreground/45 bg-transparent text-muted-foreground hover:border-muted-foreground/60 hover:bg-transparent dark:!border-white/35 dark:bg-transparent dark:text-muted-foreground dark:hover:!border-white/45 dark:hover:bg-transparent",
  owned:
    "rounded-sm border !border-border/75 bg-primary/[0.07] text-foreground hover:border-border hover:bg-primary/[0.09] dark:!border-primary/45 dark:bg-primary/15 dark:!hover:border-white/20 dark:hover:bg-primary/20",
  specialMissing:
    "rounded-sm border border-dashed !border-amber-500/55 bg-transparent text-amber-800 hover:!border-amber-500/65 hover:bg-transparent dark:!border-amber-300/35 dark:bg-transparent dark:text-amber-200 dark:hover:!border-amber-300/60 dark:hover:bg-transparent",
  specialOwned:
    "rounded-sm border !border-amber-500/60 bg-amber-300/30 text-amber-900 hover:!border-amber-500/70 hover:bg-amber-300/35 dark:!border-amber-300/55 dark:bg-amber-300/15 dark:text-amber-100 dark:hover:!border-amber-300/60 dark:hover:bg-amber-300/20",
};

function renderStickerToastTitle(
  locale: Locale,
  key: "toast.sticker.added" | "toast.sticker.removed",
  code: string,
  tone: "success" | "remove",
) {
  const template = t(locale, key, { code: stickerCodeToken });
  const tokenIndex = template.indexOf(stickerCodeToken);
  const before =
    tokenIndex === -1 ? template : template.slice(0, tokenIndex);
  const after =
    tokenIndex === -1
      ? ""
      : template.slice(tokenIndex + stickerCodeToken.length);
  const chipToneClasses =
    tone === "success"
      ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-200"
      : "border-red-500/30 bg-red-500/10 text-red-700 dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-200";

  return (
    <span className="text-sm text-current">
      {before}
      <span
        data-testid="sticker-toast-code-chip"
        className={cn(
          "mx-1 inline-flex items-center rounded-sm border px-1.5 py-0.5 font-semibold leading-none tabular-nums ",
          chipToneClasses,
        )}
      >
        {code}
      </span>
      {after}
    </span>
  );
}

export const StickerTile = memo(function StickerTile({
  sticker,
  copies,
  animations = true,
  interactive = true,
  highlighted = false,
  onTap,
  onLongPress,
}: {
  sticker: Sticker;
  copies: number;
  animations?: boolean;
  interactive?: boolean;
  highlighted?: boolean;
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
      stickerTileClasses.missing,
    !sticker.special && state === "owned" &&
      stickerTileClasses.owned,
    sticker.special && state === "missing" &&
      stickerTileClasses.specialMissing,
    sticker.special && state === "owned" &&
      stickerTileClasses.specialOwned,
    highlighted &&
      "ring-2 ring-sky-500/70 ring-offset-1 ring-offset-background !border-sky-500/45 bg-sky-500/10 text-foreground dark:ring-sky-400/70 dark:!border-sky-400/50 dark:bg-sky-500/20",
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

      <span >{sticker.number}</span>

      {state === "missing" && !sticker.special && (
        <span className="absolute bottom-[5px] md:bottom-2 size-1.5 rounded-full border border-muted-foreground/50 bg-background shadow-[0_0_0_1px_var(--background)] dark:!border-white/45 dark:bg-background" />
      )}
      {state === "missing" && sticker.special && (
        <SpecialStickerMark className="absolute bottom-[5px] md:bottom-1.5 size-2 text-amber-600/75 dark:text-amber-300/80" />
      )}

      {copies > 1 && (
        <span className="absolute right-0 top-0 flex h-5 min-w-5 w-5 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full border border-background bg-primary text-xs font-semibold text-primary-foreground shadow-sm ring-1 ring-primary/25 dark:border-background dark:ring-white/20">
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
    <div className="relative aspect-square p-1.5 text-sm">
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
  const setStickerCopies = useStickerStore((state) => state.setStickerCopies);
  const animations = useStickerStore((state) => state.settings.animations);
  const haptics = useStickerStore((state) => state.settings.haptics);
  const locale = useStickerStore((state) => state.settings.locale);
  const [highlighted, setHighlighted] = useState(false);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { guard } = useGuardedAction();

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  const highlightSticker = useCallback(() => {
    setHighlighted(true);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => {
      setHighlighted(false);
      highlightTimer.current = null;
    }, 1500);
  }, []);

  return (
    <StickerTile
      sticker={sticker}
      copies={copies}
      animations={animations}
      highlighted={highlighted}
      onTap={guard(() => {
        if (haptics) haptic("light");
        const previousCopies = copies;
        const compactCode = getCompactStickerCode(sticker);
        tapSticker(sticker.id);
        highlightSticker();
        toast.success(
          renderStickerToastTitle(
            locale,
            "toast.sticker.added",
            compactCode,
            "success",
          ),
          withStickerQuantityUndoToast({
            action: {
              label: t(locale, "toast.action.undo"),
              onClick: () => {
                setStickerCopies(sticker.id, previousCopies);
              },
            },
          }, STICKER_QUANTITY_ADD_UNDO_TOAST_ID),
        );
      })}
      onLongPress={() => {
        if (copies === 1) {
          guard(() => {
            if (haptics) haptic("medium");
            const previousCopies = copies;
            const compactCode = getCompactStickerCode(sticker);
            removeSticker(sticker.id);
            highlightSticker();
            toast(
              renderStickerToastTitle(
                locale,
                "toast.sticker.removed",
                compactCode,
                "remove",
              ),
              withStickerQuantityUndoToast({
                className:
                  "border-red-500/25 bg-red-50 text-red-950 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-100",
                classNames: {
                  actionButton:
                    "rounded-full bg-red-700 text-white hover:bg-red-700/90 dark:bg-red-500 dark:hover:bg-red-500/90",
                },
                action: {
                  label: t(locale, "toast.action.undo"),
                  onClick: () => {
                    setStickerCopies(sticker.id, previousCopies);
                  },
                },
              }, STICKER_QUANTITY_REMOVE_UNDO_TOAST_ID),
            );
          })();
        } else if (copies > 1) {
          onEditDuplicates(sticker);
        }
      }}
    />
  );
});
