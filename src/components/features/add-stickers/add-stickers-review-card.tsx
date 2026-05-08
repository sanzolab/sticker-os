"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AddStickerCandidate } from "./add-stickers-types";

export function AddStickersReviewCard({
  candidate,
  selected,
  onToggle,
}: {
  candidate: AddStickerCandidate;
  selected: boolean;
  onToggle: () => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={
        selected
          ? t(locale, "sticker.aria.remove", { code: candidate.code })
          : t(locale, "sticker.aria.select", { code: candidate.code })
      }
      className={cn(
        "grid grid-cols-[3.75rem_1fr] gap-3 rounded-sm border p-3 text-left transition-colors",
        selected
          ? "border-primary/35 bg-primary/15"
          : "border-dashed bg-background text-muted-foreground",
      )}
    >
      <span className="relative flex aspect-[3/4.35] items-center justify-center rounded-sm border bg-background text-xl font-semibold">
        {candidate.number}
        {selected && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-primary p-0.5 text-primary-foreground">
            <Check className="size-3" />
          </span>
        )}
      </span>
      <span className="min-w-0 space-y-1">
        <span className="flex items-center justify-between gap-2">
          <span className="block text-sm font-semibold text-foreground">
            {candidate.code}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex size-4 items-center justify-center rounded-[3px] border",
              selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
            )}
          >
            {selected && <Check className="size-3" />}
          </span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {candidate.groupLabel}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {t(locale, "addStickers.review.source", {
            source: candidate.source,
          })}
        </span>
        <Badge variant="secondary" className="rounded-sm">
          {Math.round(candidate.confidence * 100)}%
        </Badge>
      </span>
    </button>
  );
}
