"use client";

import { ChevronDown } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { StickerCell, StickerTile } from "@/components/sticker-cell";
import { useSectionLifecycle } from "@/components/use-section-lifecycle";
import { getSectionLifecycleRegistry } from "@/lib/section-lifecycle";
import { t } from "@/lib/i18n";
import {
  getStickerGroupLabel,
  type Sticker,
  type StickerGroup,
} from "@/lib/sticker-data";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const StickerSection = memo(function StickerSection({
  active,
  group,
  stickers: groupStickers,
  missing,
  duplicates,
  onEditDuplicates,
  collectionByStickerId,
}: {
  active: boolean;
  group: StickerGroup;
  stickers: Sticker[];
  missing: number;
  duplicates: number;
  onEditDuplicates?: (sticker: Sticker) => void;
  collectionByStickerId?: Record<string, number>;
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const registry = getSectionLifecycleRegistry();
  const [open, setOpen] = useState(() => registry.getCollapsed(group.id));
  const { ref, phase, height, skipEnter } = useSectionLifecycle(
    group.id,
    active,
  );
  const [settled, setSettled] = useState(false);

  const toggleOpen = useCallback(() => {
    const next = !open;
    setOpen(next);
    registry.setCollapsed(group.id, next);
  }, [open, group.id, registry]);

  useEffect(() => {
    if (phase !== "visible") {
      setSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), 400);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const gridClassName =
    "grid grid-cols-5 gap-2 min-[430px]:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 py-4";

  const isPlaceholder = phase === "placeholder";
  const isVisible = phase === "visible";

  return (
    <section
      ref={ref}
      data-section-id={group.id}
      aria-hidden={isPlaceholder ? true : undefined}
      inert={isPlaceholder ? true : undefined}
    >
      {isPlaceholder ? (
        <div
          style={{ height: height ?? 240 }}
          className="section-lifecycle-placeholder"
        />
      ) : (
        <div
          className={cn(
            "section-lifecycle-content",
            isVisible && "section-lifecycle-visible",
            skipEnter && "section-lifecycle-skip-enter",
            settled && "section-lifecycle-settled",
          )}
          aria-hidden={!isVisible || undefined}
        >
          <button
            type="button"
            onClick={toggleOpen}
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
              open
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="min-h-0">
              <div className={gridClassName}>
                {groupStickers.map((sticker) =>
                  collectionByStickerId ? (
                    <StickerTile
                      key={sticker.id}
                      sticker={sticker}
                      copies={collectionByStickerId[sticker.id] ?? 0}
                      interactive={false}
                    />
                  ) : (
                    <StickerCell
                      key={sticker.id}
                      sticker={sticker}
                      onEditDuplicates={onEditDuplicates!}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
