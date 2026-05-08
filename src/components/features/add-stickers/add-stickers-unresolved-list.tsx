"use client";

import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import type { AddStickerUnresolved } from "./add-stickers-types";

export function AddStickersUnresolvedList({
  unresolved,
}: {
  unresolved: AddStickerUnresolved[];
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  if (unresolved.length === 0) return null;

  return (
    <section className="rounded-sm border border-dashed p-3">
      <h3 className="text-sm font-semibold">
        {t(locale, "addStickers.unresolved.title")}
      </h3>
      <div className="mt-2 space-y-2">
        {unresolved.map((item) => (
          <p
            key={`${item.rawText}-${item.reason}`}
            className="text-xs text-muted-foreground"
          >
            <span className="font-medium text-foreground">{item.rawText}</span>
            {": "}
            {item.reason}
          </p>
        ))}
      </div>
    </section>
  );
}
