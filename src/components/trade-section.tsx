"use client";

import { TradeStickerCard } from "@/components/trade-sticker-card";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

export function TradeSection({
  title,
  detail,
  stickerIds,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  title: string;
  detail: string;
  stickerIds: string[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const selected = new Set(selectedIds);
  const allSelected =
    stickerIds.length > 0 && stickerIds.every((id) => selected.has(id));

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium text-primary">
            {selectedIds.length}/{stickerIds.length}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 px-2 text-xs shadow-none"
            onClick={onToggleAll}
          >
            {allSelected
              ? t(locale, "trade.section.clear")
              : t(locale, "trade.section.selectAll")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-8">
        {stickerIds.map((id) => (
          <TradeStickerCard
            key={id}
            stickerId={id}
            selected={selected.has(id)}
            onToggle={() => onToggle(id)}
          />
        ))}
      </div>
    </section>
  );
}
