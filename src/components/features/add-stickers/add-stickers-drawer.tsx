"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppDrawer } from "@/components/ui/app-drawer";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { analyzeVoiceSubmission } from "@/lib/voice-submit";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { useAssistantStore } from "@/lib/assistant-store";
import { AddStickersCaptureOptions } from "./add-stickers-capture-options";
import { AddStickersConfirmFooter } from "./add-stickers-confirm-footer";
import { AddStickersErrorState } from "./add-stickers-error-state";
import { AddStickersLoadingState } from "./add-stickers-loading-state";
import { AddStickersReviewList } from "./add-stickers-review-list";
import {
  fetchWithAddStickersTimeout,
  isAddStickersTimeoutError,
  isFailedAnalysisResult,
} from "./add-stickers-request";
import {
  hasPendingItems,
  useAddStickersPendingStore,
} from "./add-stickers-session";

import type {
  AddStickersError,
  AddStickersResult,
  AddStickersVoiceSubmission,
} from "./add-stickers-types";

type AddStickersMode = "capture" | "loading" | "review";

export function AddStickersDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [modeOverride, setModeOverride] = useState<"capture" | "review" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AddStickersError | null>(null);

  const locale = useStickerStore((state) => state.settings.locale);
  const tapSticker = useStickerStore((state) => state.tapSticker);
  const queuedPhotoCapture = useAssistantStore((state) => state.queuedPhotoCapture);
  const consumeQueuedPhotoCapture = useAssistantStore((state) => state.consumeQueuedPhotoCapture);
  const candidates = useAddStickersPendingStore((state) => state.candidates);
  const unresolved = useAddStickersPendingStore((state) => state.unresolved);
  const albumAnalyses = useAddStickersPendingStore((state) => state.albumAnalyses);
  const source = useAddStickersPendingStore((state) => state.source);
  const appendResult = useAddStickersPendingStore((state) => state.appendResult);
  const toggleCandidate = useAddStickersPendingStore((state) => state.toggleCandidate);
  const clearPending = useAddStickersPendingStore((state) => state.clearPending);
  const confirmAndConsume = useAddStickersPendingStore((state) => state.confirmAndConsume);
  const hasPending = hasPendingItems({ candidates, unresolved, albumAnalyses });
  const pendingCount = candidates.length;
  const mode: AddStickersMode = isLoading
    ? "loading"
    : (modeOverride ?? (hasPending ? "review" : "capture"));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsLoading(false);
      setError(null);
      setModeOverride(null);
    }
    onOpenChange(nextOpen);
  };

  const requestAnalysisResult = useCallback(async (
    request: () => Promise<Response>,
  ): Promise<
    | { ok: true; result: AddStickersResult }
    | { ok: false; error: AddStickersError }
  > => {
    try {
      const response = await request();
      const body = (await response.json()) as AddStickersResult | AddStickersError;

      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: "code" in body ? body.code : "AI_PROVIDER_ERROR",
            message: "message" in body ? body.message : t(locale, "addStickers.error.generic"),
          },
        };
      }

      const parsedResult = body as AddStickersResult;
      if (isFailedAnalysisResult(parsedResult)) {
        const isTimeout = parsedResult.meta?.timeout === true ||
          parsedResult.meta?.status === "timeout";
        return {
          ok: false,
          error: {
            code: parsedResult.meta?.errorCode ?? (isTimeout ? "AI_TIMEOUT_ERROR" : "AI_PROVIDER_ERROR"),
            message: isTimeout
              ? t(locale, "addStickers.error.timeout")
              : t(locale, "addStickers.error.generic"),
          },
        };
      }

      return {
        ok: true,
        result: parsedResult,
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: isAddStickersTimeoutError(error) ? "AI_TIMEOUT_ERROR" : "AI_PROVIDER_ERROR",
          message: isAddStickersTimeoutError(error)
            ? t(locale, "addStickers.error.timeout")
            : t(locale, "addStickers.voice.connectionError"),
        },
      };
    }
  }, [locale]);

  const mergeResult = useCallback((
    nextResult: AddStickersResult,
    nextMode: AddStickersMode = "review",
  ) => {
    appendResult(nextResult);
    setIsLoading(false);
    setModeOverride(nextMode === "review" ? "review" : "capture");
    setError(null);
  }, [appendResult]);

  const analyzeRequest = useCallback(async (request: () => Promise<Response>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestAnalysisResult(request);

      if (!result.ok) {
        setModeOverride("capture");
        setError(result.error);
        return;
      }

      mergeResult(result.result);
    } finally {
      setIsLoading(false);
    }
  }, [mergeResult, requestAnalysisResult]);

  const analyzeText = useCallback(async (text: string) => {
    await analyzeRequest(() =>
      fetchWithAddStickersTimeout("/api/ai/parse-stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", text }),
      }),
    );
  }, [analyzeRequest]);

  const analyzeFile = useCallback(async (type: "image" | "audio", file: File) => {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);

    await analyzeRequest(() =>
      fetchWithAddStickersTimeout("/api/ai/parse-stickers", {
        method: "POST",
        body: formData,
      }),
    );
  }, [analyzeRequest]);

  const handleVoiceSubmission = useCallback(async (submission: AddStickersVoiceSubmission) => {
    setIsLoading(true);
    const result = await analyzeVoiceSubmission(locale, submission);
    if (result.ok) {
      setModeOverride("review");
    }
    setIsLoading(false);
    setError(null);
    return result;
  }, [locale]);

  useEffect(() => {
    if (!open || !queuedPhotoCapture) return;

    const timer = window.setTimeout(() => {
      consumeQueuedPhotoCapture();
      void analyzeFile("image", queuedPhotoCapture.file);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [analyzeFile, consumeQueuedPhotoCapture, open, queuedPhotoCapture]);

  const confirmAdd = () => {
    confirmAndConsume()
      .forEach((candidate) => tapSticker(candidate.stickerId));
    setModeOverride("capture");
    handleOpenChange(false);
  };

  const captureMore = () => {
    setModeOverride("capture");
    setError(null);
  };

  const discardPending = () => {
    clearPending();
    setModeOverride("capture");
    setError(null);
  };

  const loading = isLoading;
  const selectedIds = candidates
    .filter((candidate) => candidate.selected)
    .map((candidate) => candidate.stickerId);
  const selectedCount = selectedIds.length;
  const providerLabel = source.mixed || !source.provider
    ? t(locale, "addStickers.pending.sourceMixed")
    : source.model
      ? `${source.provider} · ${source.model}`
      : source.provider;
  const showGeminiAssisted = source.provider === "gemini" && !source.mixed;

  return (
    <AppDrawer
      open={open}
      onOpenChange={handleOpenChange}
      bodyClassName="flex min-h-0 flex-1 flex-col p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {loading && <AddStickersLoadingState />}

        {!loading && mode === "capture" && (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-4">
            <div className="text-center">
              <Badge variant="secondary" className="mb-3 rounded-sm">
                {t(locale, "addStickers.badge")}
              </Badge>
              <DrawerTitle className="text-lg font-semibold">
                {t(locale, "addStickers.title")}
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-muted-foreground">
                {t(locale, "addStickers.description")}
              </DrawerDescription>
            </div>

            <AddStickersCaptureOptions
              loading={loading}
              onSubmitAudio={(file) => analyzeFile("audio", file)}
              onSubmitPhoto={(file) => analyzeFile("image", file)}
              onSubmitText={analyzeText}
              onSubmitVoiceTranscript={handleVoiceSubmission}
              pendingCount={pendingCount}
              onReviewPending={() => setModeOverride("review")}
            />

            {error && <AddStickersErrorState error={error} />}
          </div>
        )}

        {!loading && mode === "review" && (
          <>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-4">
              <div>
                <DrawerTitle className="text-lg font-semibold">
                  {t(locale, "addStickers.review.heading")}
                </DrawerTitle>
                <DrawerDescription className="mt-1 text-sm text-muted-foreground">
                  {t(locale, "addStickers.review.provider", { provider: providerLabel })}
                </DrawerDescription>
                {showGeminiAssisted && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5" />
                    {t(locale, "addStickers.review.geminiAssisted")}
                  </p>
                )}
              </div>
              <AddStickersReviewList
                candidates={candidates}
                unresolved={unresolved}
                albumAnalyses={albumAnalyses}
                selectedIds={selectedIds}
                onToggle={toggleCandidate}
              />
            </div>
            <AddStickersConfirmFooter
              selectedCount={selectedCount}
              onCaptureMore={captureMore}
              onDiscardPending={discardPending}
              onConfirm={confirmAdd}
            />
          </>
        )}
      </div>
    </AppDrawer>
  );
}
