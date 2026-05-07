"use client";

import { ChevronDown } from "lucide-react";
import { memo, useState, type CSSProperties } from "react";
import { StickerCard } from "@/components/sticker-card";
import { useLazySection } from "@/components/use-lazy-section";
import { t } from "@/lib/i18n";
import { getStickerGroupLabel, type Sticker, type StickerGroup } from "@/lib/sticker-data";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const StickerSection = memo(function StickerSection({
  active,
  group,
  stickers: groupStickers,
  missing,
  duplicates,
  sectionIndex,
  onEditDuplicates,
}: {
  active: boolean;
  group: StickerGroup;
  stickers: Sticker[];
  missing: number;
  duplicates: number;
  sectionIndex: number;
  onEditDuplicates: (sticker: Sticker) => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const [open, setOpen] = useState(true);
  const { ref, shouldRender, enter } = useLazySection(active && open);
  const sectionAnimationDelay = Math.min(sectionIndex * 50, 200);
  const gridClassName =
    "grid grid-cols-4 gap-3 min-[430px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 py-3";

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 py-2 text-left"
      >
        <header>
          <h2 className="text-lg font-semibold tracking-normal">
            {getStickerGroupLabel(group, locale)}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {duplicates > 0
              ? t(locale, "album.group.summaryWithDuplicates", {
                  missing,
                  duplicates,
                })
              : t(locale, "album.group.summary", { missing })}
          </p>
        </header>
        <ChevronDown
          className={cn(
            "size-5 text-muted-foreground transition-transform duration-200",
            !open && "-rotate-90",
          )}
        />
      </button>
      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div
            ref={ref}
            className={cn(
              gridClassName,
              "lazy-sticker-grid-ready",
              enter && "lazy-sticker-grid-entered",
            )}
            style={
              {
                "--lazy-section-delay": `${sectionAnimationDelay}ms`,
                ...(shouldRender && {
                  contentVisibility: "auto",
                  containIntrinsicSize: "auto 720px",
                }),
              } as CSSProperties
            }
          >
            {shouldRender &&
              groupStickers.map((sticker) => (
                <StickerCard
                  key={sticker.id}
                  sticker={sticker}
                  onEditDuplicates={onEditDuplicates}
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
});
