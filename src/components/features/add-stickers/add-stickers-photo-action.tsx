"use client";

import { useId } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AddStickersPhotoAction({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (file: File) => void | Promise<void>;
}) {
  const inputId = useId();
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <Card className="border-primary/30 bg-primary/10 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="size-4 text-primary" />
            {t(locale, "addStickers.photo.title")}
          </div>
          <p className="text-sm text-muted-foreground">
            {t(locale, "addStickers.photo.description")}
          </p>
        </div>

        <Button
          asChild
          size="pill"
          className={cn("shadow-none", loading && "pointer-events-none opacity-50")}
          aria-disabled={loading}
        >
          <label htmlFor={inputId}>
            {loading
              ? t(locale, "addStickers.analyzing")
              : t(locale, "addStickers.photo.button")}
          </label>
        </Button>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={loading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onSubmit(file);
          event.target.value = "";
        }}
      />
    </Card>
  );
}
