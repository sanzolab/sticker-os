"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

export function AddStickersConfirmFooter({
  selectedCount,
  onCaptureMore,
  onDiscardPending,
  onConfirm,
}: {
  selectedCount: number;
  onCaptureMore: () => void;
  onDiscardPending: () => void;
  onConfirm: () => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <div className="grid gap-3 border-t bg-card p-5 sm:grid-cols-[auto_auto_1fr]">
      <Button
        type="button"
        variant="secondary"
        size="pill"
        className="shadow-none"
        onClick={onCaptureMore}
      >
        {t(locale, "addStickers.pending.captureMore")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="pill"
        className="shadow-none"
        onClick={onDiscardPending}
      >
        {t(locale, "addStickers.pending.discard")}
      </Button>
      <Button
        type="button"
        size="pill"
        className="shadow-none"
        disabled={selectedCount === 0}
        onClick={onConfirm}
      >
        {t(locale, "addStickers.confirm", { count: selectedCount })}
      </Button>
    </div>
  );
}
