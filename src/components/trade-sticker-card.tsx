"use client";

import { Check } from "lucide-react";
import { SpecialStickerMark } from "@/components/special-sticker-mark";
import { getCompactStickerLabel, stickersById } from "@/lib/sticker-data";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TradeStickerCard({
  stickerId,
  selected,
  onToggle,
  readOnly = false,
}: {
  stickerId: string;
  selected: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}) {
  const sticker = stickersById[stickerId];
  const animations = useStickerStore((state) => state.settings.animations);
  const locale = useStickerStore((state) => state.settings.locale);

  if (!sticker) return null;

  const label = getCompactStickerLabel(sticker, locale);
  const selectedClasses =
    "border-border/75 bg-primary/[0.07] text-foreground dark:border-white/15 dark:bg-primary/15";
  const unselectedRegularClasses =
    "border-dashed border-muted-foreground/45 bg-transparent text-muted-foreground hover:border-muted-foreground/60 hover:bg-transparent dark:border-white/35 dark:bg-transparent dark:text-muted-foreground dark:hover:border-white/45 dark:hover:bg-transparent";
  const unselectedSpecialClasses =
    "border-dashed border-amber-500/55 bg-transparent text-amber-800 hover:border-amber-500/65 hover:bg-transparent dark:border-amber-300/45 dark:bg-transparent dark:text-amber-200 dark:hover:border-amber-300/60 dark:hover:bg-transparent";
  const labelToneClasses = selected
    ? "text-muted-foreground"
    : sticker.special
      ? "text-amber-800 dark:text-amber-200"
      : "text-muted-foreground";
  const detailToneClasses = selected
    ? "text-muted-foreground"
    : sticker.special
      ? "text-amber-800/85 dark:text-amber-200/85"
      : "text-muted-foreground";

  const cardContent = (
    <span
      className={cn(
        "relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-sm border px-1.5 py-1 text-center font-medium",
        "transition-[background-color,border-color,color,transform]",
        !readOnly && animations && "active:scale-[0.97]",
        selected
          ? selectedClasses
          : sticker.special
            ? unselectedSpecialClasses
            : unselectedRegularClasses,
      )}
    >
      {selected && (
        <span className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/25 dark:border-background dark:ring-white/20">
          <Check className="size-2.5" />
        </span>
      )}
      {sticker.special && (
        <SpecialStickerMark className="absolute bottom-1.5 size-3" />
      )}
      <span className={cn("max-w-full truncate text-[9px] font-semibold uppercase leading-none", labelToneClasses)}>
        {label.primary}
      </span>
      <span className="mt-0.5 text-base font-semibold leading-none tabular-nums sm:text-lg">
        {label.secondary}
      </span>
      <span className={cn("mt-1 max-w-full truncate text-[8px] font-medium leading-none sm:text-[9px]", detailToneClasses)}>
        {label.detail}
      </span>
    </span>
  );

  if (readOnly) {
    return (
      <div className="text-left" aria-label={sticker.code}>
        {cardContent}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="group text-left"
      aria-pressed={selected}
      aria-label={
        selected
          ? t(locale, "sticker.aria.remove", { code: sticker.code })
          : t(locale, "sticker.aria.select", { code: sticker.code })
      }
    >
      {cardContent}
    </button>
  );
}
