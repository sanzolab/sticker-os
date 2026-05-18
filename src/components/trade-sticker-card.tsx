"use client";

import { Check, Sparkles } from "lucide-react";
import { stickersById } from "@/lib/sticker-data";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TradeStickerCard({
  stickerId,
  selected,
  onToggle,
}: {
  stickerId: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const sticker = stickersById[stickerId];
  const animations = useStickerStore((state) => state.settings.animations);
  const locale = useStickerStore((state) => state.settings.locale);

  if (!sticker) return null;

  const prefix = sticker.code.replace(/\d+$/, "");

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
      <span
        className={cn(
          "relative flex aspect-[3/4] flex-col items-center justify-center rounded-sm border text-center font-medium",
          "transition-[background-color,border-color,color,transform]",
          animations && "active:scale-[0.97]",
          selected
            ? "border-border/50 bg-primary/[0.06] text-foreground"
            : "border-dashed border-muted/30 bg-transparent text-muted-foreground/40",
        )}
      >
        {selected && (
          <span className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-2.5" />
          </span>
        )}
        {sticker.special && (
          <Sparkles className="absolute right-1 top-1 size-3 text-amber-500" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {prefix}
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {sticker.number}
        </span>
      </span>
    </button>
  );
}
