"use client";

import { Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

export function AddStickersLoadingState() {
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-12 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <div>
        <h3 className="text-sm font-semibold">
          {t(locale, "addStickers.loading.title")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(locale, "addStickers.loading.description")}
        </p>
      </div>
    </div>
  );
}
