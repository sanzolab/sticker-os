"use client";

import { TradeStickerCard } from "@/components/trade-sticker-card";

export function TradeSection({
  title,
  detail,
  stickerIds,
  selectedIds,
  onToggle,
}: {
  title: string;
  detail: string;
  stickerIds: string[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const selected = new Set(selectedIds);

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-primary">
          {selectedIds.length}/{stickerIds.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 min-[430px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8">
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
