"use client";

import { useCallback } from "react";
import { ListChecks } from "lucide-react";
import { useAssistantStore } from "@/lib/assistant-store";
import { useAddStickersPendingStore } from "@/components/features/add-stickers/add-stickers-session";

export function PendingConfirmationsIndicator({ isHidden }: { isHidden: boolean }) {
  const count = useAddStickersPendingStore((s) => s.candidates.length);
  const addStickersOpen = useAssistantStore((s) => s.addStickersOpen);
  const setAddStickersOpen = useAssistantStore((s) => s.setAddStickersOpen);

  const handleClick = useCallback(() => {
    setAddStickersOpen(true);
  }, [setAddStickersOpen]);

  if (count === 0 || addStickersOpen || isHidden) return null;

  return (
    <button
      type="button"
      className="pending-indicator"
      onClick={handleClick}
      aria-label={`${count} pending sticker confirmations`}
    >
      <ListChecks className="size-[18px]" />
      <span className="pending-indicator-count">{count}</span>
    </button>
  );
}
