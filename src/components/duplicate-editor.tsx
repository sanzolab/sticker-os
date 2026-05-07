"use client";

import { type Sticker } from "@/lib/sticker-data";
import { DuplicateEditorContent } from "./duplicate-editor-content";

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
