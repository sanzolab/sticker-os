"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, ImagePlus, Sparkles, Upload, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ImageUploadPreparationError,
  prepareImageForUpload,
} from "@/lib/image-upload";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";
import { useAssistantStore } from "@/lib/assistant-store";
import { useAddStickersPendingStore } from "./add-stickers-session";
import { AddStickersConfirmFooter } from "./add-stickers-confirm-footer";
import { AddStickersLoadingState } from "./add-stickers-loading-state";
import { AddStickersReviewList } from "./add-stickers-review-list";
import {
  fetchWithAddStickersTimeout,
  isAddStickersTimeoutError,
  isEmptyAnalysisResult,
  isFailedAnalysisResult,
} from "./add-stickers-request";
import type { AddStickersError, AddStickersResult } from "./add-stickers-types";

type PhotoCaptureMode = "capture" | "loading" | "review";
type CaptureFeedback = {
  title: string;
  message: string;
};
type PhotoCaptureOptions = {
  forceNormalize?: boolean;
};
type PendingPhotoCapture = {
  file: File;
  options?: PhotoCaptureOptions;
};

export function PhotoCapturePanel() {
  const activeMode = useAssistantStore((state) => state.activeMode);
  const dismiss = useAssistantStore((state) => state.dismiss);
  const tapSticker = useStickerStore((state) => state.tapSticker);
  const locale = useStickerStore((state) => state.settings.locale);
  const candidates = useAddStickersPendingStore((state) => state.candidates);
  const unresolved = useAddStickersPendingStore((state) => state.unresolved);
  const albumAnalyses = useAddStickersPendingStore((state) => state.albumAnalyses);
  const source = useAddStickersPendingStore((state) => state.source);
  const appendResult = useAddStickersPendingStore((state) => state.appendResult);
  const toggleCandidate = useAddStickersPendingStore((state) => state.toggleCandidate);
  const clearPending = useAddStickersPendingStore((state) => state.clearPending);
  const confirmAndConsume = useAddStickersPendingStore((state) => state.confirmAndConsume);
  const pendingCount = candidates.length;

  const cameraInputId = useId();
  const galleryInputId = useId();
  const isOpen = activeMode === "photo";

  const [mode, setMode] = useState<PhotoCaptureMode>("capture");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingPhotoCapture | null>(null);
  const [captureFeedback, setCaptureFeedback] = useState<CaptureFeedback | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [exiting, setExiting] = useState(false);
  const shouldRender = isOpen || exiting;

  const primaryActionRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const exitingRef = useRef(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const closePanel = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setIsDragActive(false);
    setExiting(true);

    closeTimerRef.current = window.setTimeout(() => {
      dismiss();
      setExiting(false);
      setMode("capture");
      setCaptureFeedback(null);
      setConfirmOpen(false);
      setPendingFile(null);
      exitingRef.current = false;
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    }, 250);
  }, [dismiss]);

  const requestAnalysisResult = useCallback(async (
    request: () => Promise<Response>,
  ): Promise<
    | { ok: true; result: AddStickersResult }
    | { ok: false; error: AddStickersError }
  > => {
    try {
      const response = await request();
      const body = await readJsonBody(response);
      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: readStringField(body, "code") ?? "AI_PROVIDER_ERROR",
            message: readStringField(body, "message") ?? t(locale, "addStickers.error.generic"),
          },
        };
      }
      if (!body) {
        return {
          ok: false,
          error: {
            code: "AI_PROVIDER_ERROR",
            message: t(locale, "addStickers.error.generic"),
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
      return { ok: true, result: parsedResult };
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

  const analyzePhoto = useCallback(async (file: File, options: PhotoCaptureOptions = {}) => {
    setMode("loading");
    setCaptureFeedback(null);

    let uploadFile = file;
    try {
      uploadFile = await prepareImageForUpload(file, options);
    } catch (error) {
      if (error instanceof ImageUploadPreparationError) {
        setCaptureFeedback({
          title: t(locale, "addStickers.error.title"),
          message: t(locale, "addStickers.error.imagePreparation"),
        });
        setMode("capture");
        return;
      }
      throw error;
    }

    const formData = new FormData();
    formData.append("type", "image");
    formData.append("file", uploadFile);

    try {
      const result = await requestAnalysisResult(() =>
        fetchWithAddStickersTimeout("/api/ai/parse-stickers", {
          method: "POST",
          body: formData,
        }),
      );

      if (!result.ok) {
        setCaptureFeedback({
          title: t(locale, "addStickers.error.title"),
          message: result.error.message,
        });
        return;
      }

      if (isEmptyAnalysisResult(result.result)) {
        setCaptureFeedback({
          title: t(locale, "addStickers.empty.title"),
          message: t(locale, "addStickers.empty.description"),
        });
        return;
      }

      appendResult(result.result);
      setMode("review");
      setCaptureFeedback(null);
    } finally {
      setMode((currentMode) => currentMode === "loading" ? "capture" : currentMode);
    }
  }, [appendResult, locale, requestAnalysisResult]);

  const handleCapture = useCallback((file: File, options: PhotoCaptureOptions = {}) => {
    setCaptureFeedback(null);
    if (pendingCount > 0) {
      setPendingFile({ file, options });
      setConfirmOpen(true);
      return;
    }
    void analyzePhoto(file, options);
  }, [analyzePhoto, pendingCount]);

  const clearConfirmState = useCallback(() => {
    setConfirmOpen(false);
    setPendingFile(null);
  }, []);

  const handleReviewPending = useCallback(() => {
    clearConfirmState();
    setMode("review");
  }, [clearConfirmState]);

  const handleStartNewCapture = useCallback(() => {
    const pending = pendingFile;
    clearConfirmState();
    if (pending) void analyzePhoto(pending.file, pending.options);
  }, [analyzePhoto, clearConfirmState, pendingFile]);

  const confirmAdd = useCallback(() => {
    confirmAndConsume().forEach((candidate) => {
      tapSticker(candidate.stickerId);
    });
    closePanel();
  }, [closePanel, confirmAndConsume, tapSticker]);

  const captureMore = useCallback(() => {
    setMode("capture");
    setCaptureFeedback(null);
  }, []);

  const discardPending = useCallback(() => {
    clearPending();
    setMode("capture");
    setCaptureFeedback(null);
  }, [clearPending]);

  useEffect(() => {
    if (isOpen && !restoreFocusRef.current) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      primaryActionRef.current?.focus();
    }, 16);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closePanel, shouldRender]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  if (!shouldRender) return null;

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
    <>
      <div
        className={`photo-capture-overlay${exiting ? " out" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePanel();
        }}
        role="presentation"
      >
        <section
          role="dialog"
          aria-modal
          aria-labelledby="photo-capture-panel-title"
          className={`photo-capture-panel${exiting ? " out" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="safe-bottom safe-top flex min-h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 p-5">
                <h2 id="photo-capture-panel-title" className="text-lg font-semibold">
                  {t(locale, "addStickers.photoPanel.title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(locale, "addStickers.photoPanel.description")}
                </p>
              </div>
              <button
                type="button"
                className="mr-5 mt-5 inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aspect-square"
                onClick={closePanel}
                aria-label={t(locale, "addStickers.photoPanel.close")}
              >
                <X className="size-4" />
              </button>
            </div>

            {mode === "loading" && <AddStickersLoadingState />}

            {mode === "capture" && (
              <div className="min-h-0  space-y-5 overflow-y-auto px-5 pb-5">
                <button
                  type="button"
                  className={`group flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:border-primary/50 hover:bg-accent/50"
                  }`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragActive(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragActive(false);
                    const file = event.dataTransfer.files?.[0];
                    if (file) handleCapture(file);
                  }}
                  onClick={() => {
                    const input = document.getElementById(galleryInputId) as HTMLInputElement | null;
                    input?.click();
                  }}
                  aria-label={t(locale, "addStickers.photoPanel.dropLabel")}
                >
                  <span className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors group-hover:bg-primary/10">
                    <ImagePlus className="size-5" />
                  </span>
                  <p className="text-sm font-semibold">
                    {t(locale, "addStickers.photoPanel.dropTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(locale, "addStickers.photoPanel.dropHint")}
                  </p>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    ref={primaryActionRef}
                    type="button"
                    className="w-full"
                    onClick={() => {
                      const input = document.getElementById(cameraInputId) as HTMLInputElement | null;
                      input?.click();
                    }}
                  >
                    <Camera className="size-4" />
                    {t(locale, "addStickers.photoPanel.takePhoto")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const input = document.getElementById(galleryInputId) as HTMLInputElement | null;
                      input?.click();
                    }}
                  >
                    <Upload className="size-4" />
                    {t(locale, "addStickers.photoPanel.chooseFromGallery")}
                  </Button>
                </div>

                {captureFeedback && (
                  <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm">
                    <p className="font-medium">{captureFeedback.title}</p>
                    <p className="mt-1 text-muted-foreground">{captureFeedback.message}</p>
                  </div>
                )}
              </div>
            )}

            {mode === "review" && (
              <>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5">
                  <div>
                    <Badge variant="secondary" className="mb-3 rounded-sm">
                      {t(locale, "addStickers.badge")}
                    </Badge>
                    <h3 className="text-lg font-semibold">
                      {t(locale, "addStickers.review.heading")}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(locale, "addStickers.review.provider", { provider: providerLabel })}
                    </p>
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
        </section>

        <input
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={t(locale, "addStickers.photoPanel.takePhoto")}
          className="sr-only"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleCapture(file, { forceNormalize: true });
            event.target.value = "";
          }}
        />
        <input
          id={galleryInputId}
          type="file"
          accept="image/*"
          aria-label={t(locale, "addStickers.photoPanel.chooseFromGallery")}
          className="sr-only"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleCapture(file);
            event.target.value = "";
          }}
        />
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) clearConfirmState();
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
              <Button type="button" onClick={handleStartNewCapture}>
                {t(locale, "addStickers.pending.startNew")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

async function readJsonBody(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function readStringField(body: unknown, field: string) {
  if (typeof body !== "object" || body === null || !(field in body)) return undefined;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}
