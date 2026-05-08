"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { AddStickersReviewCard } from "./add-stickers-review-card";
import { AddStickersUnresolvedList } from "./add-stickers-unresolved-list";
import type { AddStickerCandidate, AddStickerUnresolved } from "./add-stickers-types";

export function AddStickersReviewList({
  candidates,
  unresolved,
  selectedIds,
  onToggle,
}: {
  candidates: AddStickerCandidate[];
  unresolved: AddStickerUnresolved[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const selected = new Set(selectedIds);

  if (candidates.length === 0 && unresolved.length === 0) {
    return (
      <EmptyState
        title={t(locale, "addStickers.empty.title")}
        description={t(locale, "addStickers.empty.description")}
        className="shadow-none"
      />
    );
  }

  return (
    <div className="space-y-5">
      {candidates.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">
                {t(locale, "addStickers.review.title")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(locale, "addStickers.review.description")}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-primary">
              {selectedIds.length}/{candidates.length}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {candidates.map((candidate) => (
              <AddStickersReviewCard
                key={candidate.stickerId}
                candidate={candidate}
                selected={selected.has(candidate.stickerId)}
                onToggle={() => onToggle(candidate.stickerId)}
              />
            ))}
          </div>
        </section>
      )}

      <AddStickersUnresolvedList unresolved={unresolved} />
    </div>
  );
}
