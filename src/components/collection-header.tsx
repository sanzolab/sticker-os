"use client";

import { ChevronRight, CircleDot, Sparkles, Trophy } from "lucide-react";
import { useStickerStore, useCollectionStats } from "@/lib/store";
import { t } from "@/lib/i18n";
import { HeaderMetric } from "./header-metric";
import { ProgressRing } from "./progress-ring";

export function CollectionHeader({
  stats,
  onViewMore,
}: {
  stats: ReturnType<typeof useCollectionStats>;
  onViewMore: () => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <>
      <div className="w-full">
        <div className="min-w-0">
          <div className="grid grid-cols-3 divide-x">
            <div className="grid place-items-center p-4 px-4 md:p-6">
              <ProgressRing value={stats.completion} size="default" />
            </div>
            <div className="min-w-0 grid place-items-center p-4 px-4 md:p-6">
              <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t(locale, "collection.progressLabel")}
              </p>
              <p className="mt-2 text-lg font-medium leading-none tracking-normal sm:text-3xl">
                {stats.collected}/{stats.total}
              </p>
            </div>
            <div className="grid place-items-center p-4 md:p-6">
              <button
                type="button"
                onClick={onViewMore}
                className="inline-flex shrink-0 items-center gap-1 px-4 pt-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
              >
                {t(locale, "collection.viewMore")}
                <ChevronRight className="mt-0.5 size-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid w-full grid-cols-4 divide-x text-center">
        <HeaderMetric
          icon={<CircleDot className="size-5 text-primary" />}
          label={t(locale, "collection.collected")}
          value={stats.collected}
        />
        <HeaderMetric
          icon={<CircleDot className="size-5 text-foreground" />}
          label={t(locale, "collection.missing")}
          value={stats.missing}
        />
        <HeaderMetric
          icon={<Trophy className="size-5 text-amber-500" />}
          label={t(locale, "collection.duplicates")}
          value={stats.duplicateCopies}
        />
        <HeaderMetric
          icon={<Sparkles className="size-5 text-yellow-400" />}
          label={t(locale, "collection.special")}
          value={`${stats.specialCollected}/${stats.specialTotal}`}
        />
      </div>
    </>
  );
}
