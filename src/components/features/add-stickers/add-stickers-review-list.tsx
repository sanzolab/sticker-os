"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { AddStickersReviewCard } from "./add-stickers-review-card";
import { AddStickersUnresolvedList } from "./add-stickers-unresolved-list";
import type {
  AddStickerCandidate,
  AddStickerUnresolved,
  AddStickersAlbumAnalysis,
} from "./add-stickers-types";

export function AddStickersReviewList({
  candidates,
  unresolved,
  albumAnalyses,
  selectedIds,
  onToggle,
}: {
  candidates: AddStickerCandidate[];
  unresolved: AddStickerUnresolved[];
  albumAnalyses: AddStickersAlbumAnalysis[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const selected = new Set(selectedIds);

  if (candidates.length === 0 && unresolved.length === 0 && albumAnalyses.length === 0) {
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
      {albumAnalyses.length > 0 && (
        <section className="space-y-3 rounded-sm border border-dashed p-3">
          {albumAnalyses.map((analysis, index) => (
            <div key={`${analysis.methodology}-${analysis.group ?? "unknown"}-${index}`} className="space-y-2">
              <h3 className="text-sm font-semibold">
                {t(locale, "addStickers.review.album.missing")}
                {": "}
                {formatInventoryCodes(analysis.faltantes)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t(locale, "addStickers.review.album.present")}
                {": "}
                {formatInventoryCodes(analysis.presentes)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(locale, "addStickers.review.album.method")}
              </p>
              {analysis.status === "needs_review" && (
                <p className="text-xs text-muted-foreground">
                  {t(locale, "addStickers.review.album.needsReview")}
                </p>
              )}
              {analysis.uncertain.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t(locale, "addStickers.review.album.uncertain")}
                  {": "}
                  {formatUncertainSlots(analysis)}
                </p>
              )}
              {analysis.warnings.map((warning, warningIndex) => (
                <p key={`${warning}-${warningIndex}`} className="text-xs text-muted-foreground">
                  {warning}
                </p>
              ))}
            </div>
          ))}
        </section>
      )}

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

function formatInventoryCodes(items: Array<{ group: string; number: string }>) {
  if (items.length === 0) return "-";
  return items.map((item) => `${item.group} ${item.number}`).join(", ");
}

function formatUncertainSlots(analysis: AddStickersAlbumAnalysis) {
  return analysis.uncertain
    .map((item) => {
      const group = item.group ?? analysis.group ?? "?";
      const number = item.number ?? "?";
      if (!item.reason) return `${group} ${number}`;
      return `${group} ${number} (${item.reason})`;
    })
    .join(", ");
}
