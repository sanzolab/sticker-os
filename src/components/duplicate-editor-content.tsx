"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { AppDrawer } from "@/components/ui/app-drawer";
import { getStickerGroupLabelById, type Sticker } from "@/lib/sticker-data";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

export function DuplicateEditorContent({
  sticker,
  onOpenChange,
}: {
  sticker: Sticker;
  onOpenChange: (open: boolean) => void;
}) {
  const copies = useStickerStore(
    (state) => state.collectionByStickerId[sticker.id] ?? 0,
  );
  const locale = useStickerStore((state) => state.settings.locale);
  const setStickerCopies = useStickerStore((state) => state.setStickerCopies);
  const [draft, setDraft] = useState<number | null>(null);
  const duplicateDraft = draft ?? Math.max(copies - 1, 0);

  return (
    <AppDrawer
      open
      bodyClassName="text-center"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setDraft(null);
        onOpenChange(nextOpen);
      }}
    >
      <Badge variant="secondary" className="mb-3 rounded-sm">
        {sticker.code}
      </Badge>
      <DrawerTitle className="text-lg font-semibold">
        {t(locale, "duplicate.title")}
      </DrawerTitle>
      <DrawerDescription className="mt-1 text-sm text-muted-foreground">
        {t(locale, "duplicate.description", {
          group: getStickerGroupLabelById(sticker.groupId, locale),
        })}
      </DrawerDescription>
      <div className="mx-auto my-6 flex items-center justify-center gap-4">
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full shadow-none"
          onClick={() =>
            setDraft((value) => Math.max((value ?? duplicateDraft) - 1, 0))
          }
          aria-label={t(locale, "duplicate.decrease")}
        >
          <Minus className="size-4" />
        </Button>
        <div className="min-w-14 text-3xl font-semibold">{duplicateDraft}</div>
        <Button
          size="icon"
          className="rounded-full shadow-none"
          onClick={() => setDraft((value) => (value ?? duplicateDraft) + 1)}
          aria-label={t(locale, "duplicate.increase")}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <Button
        size="pill"
        className="w-full"
        onClick={() => {
          const previousCopies = copies;
          const nextCopies = duplicateDraft + 1;
          setStickerCopies(sticker.id, nextCopies);
          toast.success(t(locale, "toast.sticker.changesSaved"), {
            action:
              previousCopies !== nextCopies
                ? {
                    label: t(locale, "toast.action.undo"),
                    onClick: () => {
                      setStickerCopies(sticker.id, previousCopies);
                    },
                  }
                : undefined,
          });
          onOpenChange(false);
        }}
      >
        {t(locale, "duplicate.confirm")}
      </Button>
    </AppDrawer>
  );
}
