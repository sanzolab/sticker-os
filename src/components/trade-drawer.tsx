"use client";

import Image from "next/image";
import QRCode from "react-qr-code";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, QrCode, ScanLine, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { stickers } from "@/lib/sticker-data";
import {
  parseExchangeQrPayload,
  type ExchangeQrMessageKey,
} from "@/lib/exchange-qr";
import { useStickerStore } from "@/lib/store";
import { useTradeSessionStore } from "@/lib/trade-session";
import {
  cloneCollection,
  hasCollectionChangedSinceExpected,
  type CollectionSnapshotUndo,
} from "@/lib/collection-snapshot-undo";
import {
  buildTradeMatches,
  getLocalDuplicateIds,
  getLocalMissingIds,
  previewTradeImpact,
} from "@/lib/trade";
import {
  sanitizeTradeDisplayName,
} from "@/lib/trade-qr";
import { t } from "@/lib/i18n";
import { TradeScanner } from "./trade-scanner";
import { DrawerHeader } from "./drawer-header";
import { TradeSection } from "./trade-section";
import { SummaryList } from "./summary-list";

type TradeStep = "entry" | "scan" | "result";

export function TradeDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<TradeStep>("entry");
  const [scanErrorKey, setScanErrorKey] = useState<TradeMessageKey | null>(null);
  const [applyErrorKey, setApplyErrorKey] = useState<TradeMessageKey | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [showMyQr, setShowMyQr] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exchangeUndoDialogOpen, setExchangeUndoDialogOpen] = useState(false);
  const [pendingExchangeUndo, setPendingExchangeUndo] = useState<CollectionSnapshotUndo | null>(
    null,
  );
  const scanAbortRef = useRef<AbortController | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);

  const locale = useStickerStore((state) => state.settings.locale);
  const collectionName = useStickerStore((state) => state.selectedCollection);
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );
  const applyTrade = useStickerStore((state) => state.applyTrade);
  const setCollectionByStickerId = useStickerStore(
    (state) => state.setCollectionByStickerId,
  );
  const result = useTradeSessionStore((state) => state.result);
  const selectedReceiveIds = useTradeSessionStore(
    (state) => state.selectedReceiveIds,
  );
  const selectedGiveIds = useTradeSessionStore(
    (state) => state.selectedGiveIds,
  );
  const setTradeResult = useTradeSessionStore((state) => state.setResult);
  const toggleReceiveId = useTradeSessionStore((state) => state.toggleReceiveId);
  const toggleGiveId = useTradeSessionStore((state) => state.toggleGiveId);
  const toggleAllReceiveIds = useTradeSessionStore(
    (state) => state.toggleAllReceiveIds,
  );
  const toggleAllGiveIds = useTradeSessionStore(
    (state) => state.toggleAllGiveIds,
  );
  const clearTradeSession = useTradeSessionStore((state) => state.clearSession);

  const displayName = sanitizeTradeDisplayName(collectionName);
  const stickerOsIndexes = useMemo(
    () => getStickerOsIndexesFromCollection(collectionByStickerId),
    [collectionByStickerId],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadQr() {
      try {
        const qr = await requestStickerOsQrEncode(
          stickerOsIndexes,
          controller.signal,
        );
        setQrValue(qr);
      } catch {
        if (!controller.signal.aborted) setQrValue("");
      }
    }

    void loadQr();

    return () => controller.abort();
  }, [stickerOsIndexes]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowMyQr(false);
      setExitDialogOpen(false);
      setExchangeUndoDialogOpen(false);
      lastScannedCodeRef.current = null;
    }
    onOpenChange(nextOpen);
  };

  const handleScan = useCallback(
    async (value: string) => {
      if (scanAbortRef.current) {
        scanAbortRef.current.abort();
      }

      const controller = new AbortController();
      scanAbortRef.current = controller;

      const parsed = await parseExchangeQrPayload(value, controller.signal);

      if (controller.signal.aborted) return;
      scanAbortRef.current = null;

      if (!parsed.ok) {
        setScanErrorKey(parsed.errorKey);
        toast.error(t(locale, "toast.scan.invalid"));
        return;
      }

      if (lastScannedCodeRef.current === value) {
        toast.warning(t(locale, "toast.scan.duplicate"));
        return;
      }
      lastScannedCodeRef.current = value;

      const matches = buildTradeMatches({
        localMissingIds: getLocalMissingIds(collectionByStickerId),
        localDuplicateIds: getLocalDuplicateIds(collectionByStickerId),
        remoteMissingIds: parsed.payload.missingIds,
        remoteDuplicateIds: parsed.payload.duplicateIds,
      });

      setTradeResult({
        remoteName: parsed.payload.name || "",
        receiveIds: matches.receiveIds,
        giveIds: matches.giveIds,
      });
      setScanErrorKey(null);
      setApplyErrorKey(null);
      setStep("result");
      toast.success(t(locale, "toast.scan.success"));
    },
    [collectionByStickerId, locale, setTradeResult],
  );

  const toggleReceive = (id: string) => {
    setApplyErrorKey(null);
    toggleReceiveId(id);
  };

  const toggleGive = (id: string) => {
    setApplyErrorKey(null);
    toggleGiveId(id);
  };

  const toggleAllReceive = () => {
    if (!result) return;
    setApplyErrorKey(null);
    toggleAllReceiveIds(result.receiveIds);
  };

  const toggleAllGive = () => {
    if (!result) return;
    setApplyErrorKey(null);
    toggleAllGiveIds(result.giveIds);
  };

  const impact = useMemo(
    () =>
      previewTradeImpact(
        collectionByStickerId,
        selectedReceiveIds,
        selectedGiveIds,
      ),
    [collectionByStickerId, selectedGiveIds, selectedReceiveIds],
  );

  const canConfirm =
    selectedReceiveIds.length > 0 && selectedGiveIds.length > 0 && Boolean(result);

  const confirmLabel = t(locale, "trade.confirm.label", {
    receive: selectedReceiveIds.length,
    give: selectedGiveIds.length,
  });
  const remoteName = result?.remoteName || t(locale, "trade.collectorFallback");
  const activeStep = result ? "result" : step;

  const confirmTrade = () => {
    const previousCollection = cloneCollection(collectionByStickerId);
    const tradeResult = applyTrade(selectedReceiveIds, selectedGiveIds);

    if (!tradeResult.ok) {
      setApplyErrorKey(
        tradeResult.reason === "stale-duplicates"
          ? "trade.error.staleDuplicates"
          : tradeResult.reason === "stale-receive"
            ? "trade.error.staleReceive"
            : "trade.error.invalidSelection",
      );
      toast.error(t(locale, "toast.exchange.failed"));
      return;
    }

    const expectedCurrentCollection = cloneCollection(
      useStickerStore.getState().collectionByStickerId,
    );

    setPendingExchangeUndo({
      beforeCollection: previousCollection,
      expectedCurrentCollection,
    });
    toast.success(t(locale, "toast.exchange.completed"), {
      action: {
        label: t(locale, "toast.action.undo"),
        onClick: () => {
          setExchangeUndoDialogOpen(true);
        },
      },
    });

    clearTradeSession();
    setStep("entry");
    handleOpenChange(false);
  };

  const discardTrade = () => {
    clearTradeSession();
    setApplyErrorKey(null);
    setScanErrorKey(null);
    setExitDialogOpen(false);
    setStep("entry");
    lastScannedCodeRef.current = null;
  };

  return (
    <AppDrawer
      open={open}
      onOpenChange={handleOpenChange}
      scrollable={false}
      bodyClassName="flex min-h-0 flex-1 flex-col p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {activeStep === "entry" && (
          <div className="space-y-5 px-5 pb-5 pt-4 text-center">
            <div>
              <Badge variant="secondary" className="mb-3 rounded-sm">
                {displayName || "StickerOS"}
              </Badge>
              <DrawerTitle className="text-lg font-semibold">
                {t(locale, "trade.title")}
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-muted-foreground">
                {t(locale, "trade.description")}
              </DrawerDescription>
            </div>

            <div className="relative mx-auto grid aspect-square w-full max-w-64 place-items-center rounded-sm border bg-white p-5">
              {qrValue ? (
                <>
                  <QRCode
                    value={qrValue}
                    size={224}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#111827"
                    className="h-auto w-full"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex aspect-square w-[20%] items-center justify-center rounded-sm bg-white ring-1 ring-white">
                      <Image
                        src="/icon.svg"
                        alt="StickerOS"
                        width={40}
                        height={40}
                        unoptimized
                        className="block h-4/5 w-4/5 select-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid aspect-square w-full place-items-center text-sm text-muted-foreground">
                  Preparing QR...
                </div>
              )}
            </div>

            <Button
              type="button"
              size="pill"
              className="w-full shadow-none"
              onClick={() => setStep("scan")}
            >
              <ScanLine className="size-4" />
              {t(locale, "trade.scan.button")}
            </Button>
          </div>
        )}

        {activeStep === "scan" && (
          <div className="space-y-5 px-5 pb-5 pt-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <DrawerHeader
                  title={t(locale, "trade.scan.title")}
                  description={t(locale, "trade.scan.description")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 -mr-2"
                onClick={() => setShowMyQr(true)}
                aria-label={t(locale, "trade.myQr.title")}
              >
                <QrCode className="size-5" />
              </Button>
            </div>
            <TradeScanner onScan={handleScan} />
            {scanErrorKey && (
              <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {t(locale, scanErrorKey)}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="pill"
              className="w-full shadow-none"
              onClick={() => {
                setScanErrorKey(null);
                setStep("entry");
              }}
            >
              <ArrowLeft className="size-4" />
              {t(locale, "trade.scan.back")}
            </Button>
          </div>
        )}

        {activeStep === "result" && result && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-4">
              <div className="flex items-start gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 -ml-2"
                  onClick={() => setExitDialogOpen(true)}
                  aria-label={t(locale, "trade.exit.dialogTitle")}
                >
                  <ArrowLeft className="size-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <DrawerHeader
                    title={t(locale, "trade.comparison.title")}
                    description={t(locale, "trade.comparison.description", {
                      name: remoteName,
                    })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 -mr-2"
                  onClick={() => setShowMyQr(true)}
                  aria-label={t(locale, "trade.myQr.title")}
                >
                  <QrCode className="size-5" />
                </Button>
              </div>

              {result.receiveIds.length === 0 && result.giveIds.length === 0 ? (
                <EmptyState
                  title={t(locale, "trade.comparison.noMatchesTitle")}
                  description={t(locale, "trade.comparison.noMatchesDescription")}
                  className="shadow-none"
                />
              ) : (
                <>
                  <TradeSection
                    title={t(locale, "trade.section.receive.title", {
                      count: result.receiveIds.length,
                    })}
                    detail={t(locale, "trade.section.receive.detail", {
                      name: remoteName,
                      count: result.receiveIds.length,
                    })}
                    stickerIds={result.receiveIds}
                    selectedIds={selectedReceiveIds}
                    onToggle={toggleReceive}
                    onToggleAll={toggleAllReceive}
                  />
                  <TradeSection
                    title={t(locale, "trade.section.give.title", {
                      count: result.giveIds.length,
                    })}
                    detail={t(locale, "trade.section.give.detail", {
                      name: remoteName,
                      count: result.giveIds.length,
                    })}
                    stickerIds={result.giveIds}
                    selectedIds={selectedGiveIds}
                    onToggle={toggleGive}
                    onToggleAll={toggleAllGive}
                  />
                </>
              )}

              {applyErrorKey && (
                <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {t(locale, applyErrorKey)}
                </p>
              )}
            </div>

            <div className="safe-bottom border-t bg-card p-5">
              {result.receiveIds.length === 0 && result.giveIds.length === 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="pill"
                  className="w-full shadow-none"
                  onClick={() => {
                    clearTradeSession();
                    setStep("scan");
                  }}
                >
                  {t(locale, "trade.scanAnother")}
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="pill"
                      className="w-full shadow-none"
                      disabled={!canConfirm}
                    >
                      {confirmLabel}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t(locale, "trade.confirm.dialogTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(locale, "trade.confirm.dialogDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-3 text-sm">
                      <SummaryList
                        title={t(locale, "trade.summary.receive")}
                        ids={selectedReceiveIds}
                      />
                      <SummaryList
                        title={t(locale, "trade.summary.give")}
                        ids={selectedGiveIds}
                      />
                      <div>
                        <p className="font-medium">
                          {t(locale, "trade.albumImpact")}
                        </p>
                        <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-sm border p-2 text-xs text-muted-foreground">
                          {impact.map((item) => (
                            <p key={item.id}>
                              {item.code}: {item.before} -&gt; {item.after}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <Button variant="secondary" className="shadow-none">
                          {t(locale, "common.cancel")}
                        </Button>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button className="shadow-none" onClick={confirmTrade}>
                          {confirmLabel}
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showMyQr && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowMyQr(false)}
            />
            <motion.div
              className="fixed inset-0 z-[61] flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowMyQr(false)}
            >
              <motion.div
                className="relative w-full max-w-xs rounded-xl border bg-card p-5 shadow-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {t(locale, "trade.myQr.title")}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="-mr-2 -mt-1 size-8"
                    onClick={() => setShowMyQr(false)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="relative mx-auto aspect-square w-full rounded-sm border bg-white p-3">
                  {qrValue ? (
                    <>
                      <QRCode
                        value={qrValue}
                        size={224}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#111827"
                        className="h-auto w-full"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex aspect-square w-[20%] items-center justify-center rounded-sm bg-white ring-1 ring-white">
                          <Image
                            src="/icon.svg"
                            alt="StickerOS"
                            width={32}
                            height={32}
                            unoptimized
                            className="block h-4/5 w-4/5 select-none"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid aspect-square w-full place-items-center text-sm text-muted-foreground">
                      Preparing QR...
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(locale, "trade.exit.dialogTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(locale, "trade.exit.dialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" className="shadow-none">
                {t(locale, "common.cancel")}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="destructive"
                className="shadow-none"
                onClick={discardTrade}
              >
                {t(locale, "trade.exit.dialogConfirm")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={exchangeUndoDialogOpen}
        onOpenChange={setExchangeUndoDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(locale, "toast.exchange.undoTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingExchangeUndo &&
              hasCollectionChangedSinceExpected({
                currentCollection: collectionByStickerId,
                expectedCurrentCollection: pendingExchangeUndo.expectedCurrentCollection,
              })
                ? t(locale, "toast.exchange.undoOverwriteDescription")
                : t(locale, "toast.exchange.undoDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="secondary" className="shadow-none">
                {t(locale, "common.cancel")}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="destructive"
                className="shadow-none"
                onClick={() => {
                  if (!pendingExchangeUndo) {
                    setExchangeUndoDialogOpen(false);
                    return;
                  }

                  try {
                    setCollectionByStickerId(pendingExchangeUndo.beforeCollection);
                    setPendingExchangeUndo(null);
                    setExchangeUndoDialogOpen(false);
                    toast.success(t(locale, "toast.exchange.reverted"));
                  } catch {
                    toast.error(t(locale, "toast.exchange.revertFailed"));
                  }
                }}
              >
                {t(locale, "toast.exchange.undoConfirm")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppDrawer>
  );
}

type StickerOsIndexes = {
  ownedIndexes: number[];
  duplicateIndexes: number[];
};

export type TradeMessageKey =
  | ExchangeQrMessageKey
  | "trade.error.invalidCollection"
  | "trade.error.invalidLength"
  | "trade.error.invalidHash"
  | "trade.error.invalidVersion"
  | "trade.error.invalidBitset"
  | "trade.error.invalidQr"
  | "trade.error.staleDuplicates"
  | "trade.error.staleReceive"
  | "trade.error.invalidSelection";

export function getStickerOsIndexesFromCollection(
  collectionByStickerId: Record<string, number>,
): StickerOsIndexes {
  return {
    ownedIndexes: stickers
      .filter((sticker) => (collectionByStickerId[sticker.id] ?? 0) > 0)
      .map((sticker) => sticker.stickerOsIndex),
    duplicateIndexes: stickers
      .filter((sticker) => (collectionByStickerId[sticker.id] ?? 0) > 1)
      .map((sticker) => sticker.stickerOsIndex),
  };
}

export async function requestStickerOsQrEncode(
  indexes: StickerOsIndexes,
  signal: AbortSignal,
) {
  const response = await fetch("/api/stickeros/qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "encode",
      ownedIndexes: indexes.ownedIndexes,
      duplicateIndexes: indexes.duplicateIndexes,
    }),
    signal,
  });

  if (!response.ok) throw new Error("StickerOS QR encode failed");

  const body = (await response.json()) as { qr?: string };
  if (!body.qr) throw new Error("StickerOS QR response did not include qr");

  return body.qr;
}
