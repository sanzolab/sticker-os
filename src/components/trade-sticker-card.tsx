"use client";

import { Check } from "lucide-react";
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
          "relative flex aspect-[3/4.35] flex-col items-center justify-center rounded-sm border text-center font-medium",
          "transition-[background-color,border-color,color,transform]",
          animations && "active:scale-[0.97]",
          selected
            ? "border-primary/35 bg-primary/20 text-foreground"
            : "border-dashed border-border/70 bg-background text-muted-foreground/70",
        )}
      >
        {selected && (
          <span className="absolute left-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </span>
        )}
        {sticker.special && (
          <span className="absolute right-2 top-2 text-sm text-yellow-400">
            ✨
          </span>
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {prefix}
        </span>
        <span className="text-2xl">{sticker.number}</span>
      </span>
    </button>
  );
}
