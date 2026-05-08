"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

export function AddStickersManualInput({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (text: string) => void | Promise<void>;
}) {
  const [text, setText] = useState("");
  const locale = useStickerStore((state) => state.settings.locale);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    void onSubmit(value);
  };

  return (
    <form className="space-y-2 rounded-sm border bg-card p-3" onSubmit={handleSubmit}>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="add-stickers-manual">
        {t(locale, "addStickers.manual.label")}
      </label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          id="add-stickers-manual"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t(locale, "addStickers.manual.placeholder")}
          maxLength={2000}
          disabled={loading}
        />
        <Button
          type="submit"
          size="pill"
          className="shadow-none"
          disabled={loading || text.trim().length === 0}
        >
          <Plus className="size-4" />
          {loading
            ? t(locale, "addStickers.analyzing")
            : t(locale, "addStickers.manual.submit")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(locale, "addStickers.manual.hint")}
      </p>
    </form>
  );
}
