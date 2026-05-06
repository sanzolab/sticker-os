import { getStickerGroupLabelById, Sticker } from "@/lib/sticker-data";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Minus, Plus } from "lucide-react";

export function DuplicateEditor({
  sticker,
  open,
  onOpenChange,
}: {
  sticker: Sticker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) return null;

  return (
    <DuplicateEditorContent sticker={sticker} onOpenChange={onOpenChange} />
  );
}

function DuplicateEditorContent({
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
    <Drawer
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setDraft(null);
        onOpenChange(nextOpen);
      }}
    >
      <DrawerContent>
        <div className="px-5 pb-5 pt-4 text-center">
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
            <div className="min-w-14 text-3xl font-semibold">
              {duplicateDraft}
            </div>
            <Button
              size="icon"
              className="rounded-full shadow-none"
              onClick={() => setDraft((value) => (value ?? duplicateDraft) + 1)}
              aria-label={t(locale, "duplicate.increase")}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <DrawerClose asChild>
            <Button
              size="pill"
              className="w-full"
              onClick={() => setStickerCopies(sticker.id, duplicateDraft + 1)}
            >
              {t(locale, "duplicate.confirm")}
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
