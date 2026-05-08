"use client";

import { useRef, useState } from "react";
import { ListChecks } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { AddStickersManualInput } from "./add-stickers-manual-input";
import { AddStickersPhotoAction } from "./add-stickers-photo-action";
import type { AddStickersVoiceSubmission } from "./add-stickers-types";
import { AddStickersVoiceAction } from "./add-stickers-voice-action";

export function AddStickersCaptureOptions({
  loading,
  onSubmitAudio,
  onSubmitPhoto,
  onSubmitText,
  onSubmitVoiceTranscript,
  pendingCount,
  onReviewPending,
}: {
  loading: boolean;
  onSubmitAudio: (file: File) => void | Promise<void>;
  onSubmitPhoto: (file: File) => void | Promise<void>;
  onSubmitText: (text: string) => void | Promise<void>;
  onSubmitVoiceTranscript: (submission: AddStickersVoiceSubmission) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  pendingCount: number;
  onReviewPending: () => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);
  const pendingResolveRef = useRef<((value: boolean) => void) | null>(null);

  const clearPendingConfirmation = () => {
    pendingActionRef.current = null;
    pendingResolveRef.current = null;
    setConfirmOpen(false);
  };

  const runWithPendingGuard = (run: () => void | Promise<void>) => {
    if (pendingCount <= 0) {
      void run();
      return;
    }

    pendingActionRef.current = run;
    setConfirmOpen(true);
  };

  const requestCaptureApproval = () => {
    if (pendingCount <= 0) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      pendingResolveRef.current = resolve;
      setConfirmOpen(true);
    });
  };

  const resolveGuard = (value: boolean) => {
    const resolve = pendingResolveRef.current;
    pendingResolveRef.current = null;
    if (resolve) resolve(value);
  };

  const handleStartNew = () => {
    const run = pendingActionRef.current;
    resolveGuard(true);
    clearPendingConfirmation();
    if (run) void run();
  };

  const handleReviewPending = () => {
    resolveGuard(false);
    clearPendingConfirmation();
    onReviewPending();
  };

  const handleCancel = () => {
    resolveGuard(false);
    clearPendingConfirmation();
  };

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="pill"
          className="w-full shadow-none"
          onClick={onReviewPending}
        >
          <ListChecks className="size-4" />
          {t(locale, "addStickers.pending.review", { count: pendingCount })}
        </Button>
      )}

      <AddStickersPhotoAction
        loading={loading}
        onSubmit={(file) => runWithPendingGuard(() => onSubmitPhoto(file))}
      />
      <AddStickersVoiceAction
        loading={loading}
        onSubmitAudio={(file) => runWithPendingGuard(() => onSubmitAudio(file))}
        onSubmitTranscript={onSubmitVoiceTranscript}
        onBeforeStartCapture={requestCaptureApproval}
      />
      <AddStickersManualInput
        loading={loading}
        onSubmit={(text) => runWithPendingGuard(() => onSubmitText(text))}
      />

      <AlertDialog open={confirmOpen} onOpenChange={(nextOpen) => {
        if (!nextOpen) handleCancel();
      }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(locale, "addStickers.pending.warning.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(locale, "addStickers.pending.warning.description", { count: pendingCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" onClick={handleReviewPending}>
                {t(locale, "addStickers.pending.reviewShort")}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" onClick={handleStartNew}>
                {t(locale, "addStickers.pending.startNew")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
