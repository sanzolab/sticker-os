"use client";

import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import type { AddStickersError } from "./add-stickers-types";

export function AddStickersErrorState({
  error,
}: {
  error: AddStickersError;
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <div className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="font-medium">{t(locale, "addStickers.error.title")}</p>
      <p className="mt-1">{error.message}</p>
      <p className="mt-2 text-xs opacity-80">{error.code}</p>
    </div>
  );
}
