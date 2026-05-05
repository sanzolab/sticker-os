import { Sticker } from "@/lib/sticker-data";
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
  const copies = useStickerStore(
    (state) => state.collectionByStickerId[sticker.id] ?? 0,
  );
  const setStickerCopies = useStickerStore((state) => state.setStickerCopies);
  const [draft, setDraft] = useState<number | null>(null);
  const duplicateDraft = draft ?? Math.max(copies - 1, 0);

  return (
    <Drawer
      open={open}
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
            Edit duplicates
          </DrawerTitle>
          <DrawerDescription className="mt-1 text-sm text-muted-foreground">
            Set extra copies for {sticker.groupLabel}.
          </DrawerDescription>
          <div className="mx-auto my-6 flex items-center justify-center gap-4">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full shadow-none"
              onClick={() =>
                setDraft((value) => Math.max((value ?? duplicateDraft) - 1, 0))
              }
              aria-label="Decrease duplicates"
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
              aria-label="Increase duplicates"
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
              Confirm
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
