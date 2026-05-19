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

  const cardContent = (
    <span
      className={cn(
        "relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-sm border px-1.5 py-1 text-center font-medium",
        "transition-[background-color,border-color,color,transform]",
        !readOnly && animations && "active:scale-[0.97]",
        selected
          ? "border-border/50 bg-primary/[0.06] text-foreground"
          : sticker.special
            ? "border-dashed border-amber-500/20 bg-transparent text-muted-foreground/50"
            : "border-dashed border-muted/30 bg-transparent text-muted-foreground/40",
      )}
    >
      {selected && (
        <span className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-2.5" />
        </span>
      )}
      {sticker.special && (
        <SpecialStickerMark className="absolute bottom-1.5 size-3" />
      )}
      <span className="max-w-full truncate text-[9px] font-semibold uppercase leading-none text-muted-foreground">
        {label.primary}
      </span>
      <span className="mt-0.5 text-base font-semibold leading-none tabular-nums sm:text-lg">
        {label.secondary}
      </span>
      <span className="mt-1 max-w-full truncate text-[8px] font-medium leading-none text-muted-foreground/75 sm:text-[9px]">
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
