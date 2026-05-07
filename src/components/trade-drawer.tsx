"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "react-qr-code";
import { ArrowLeft, ScanLine } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { stickers, stickersById, stickersByStickerOsIndex } from "@/lib/sticker-data";
import { useStickerStore } from "@/lib/store";
import {
  buildTradeMatches,
  getLocalDuplicateIds,
  getLocalMissingIds,
  previewTradeImpact,
} from "@/lib/trade";
import {
  parseTradeQrPayload,
  sanitizeTradeDisplayName,
  type TradeQrParseError,
} from "@/lib/trade-qr";
import { t } from "@/lib/i18n";
import { TradeScanner } from "./trade-scanner";
import { TradeStickerCard } from "./trade-sticker-card";

type TradeStep = "entry" | "scan" | "result";

type TradeResult = {
  remoteName: string;
  receiveIds: string[];
  giveIds: string[];
};

type TradeMessageKey =
  | "trade.error.invalidCollection"
  | "trade.error.invalidLength"
  | "trade.error.invalidHash"
  | "trade.error.invalidVersion"
  | "trade.error.invalidBitset"
  | "trade.error.invalidQr"
  | "trade.error.staleDuplicates"
  | "trade.error.invalidSelection";

export function TradeDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = React.useState<TradeStep>("entry");
  const [scanErrorKey, setScanErrorKey] =
    React.useState<TradeMessageKey | null>(null);
  const [applyErrorKey, setApplyErrorKey] =
    React.useState<TradeMessageKey | null>(null);
  const [result, setResult] = React.useState<TradeResult | null>(null);
  const [qrValue, setQrValue] = React.useState("");
  const [selectedReceiveIds, setSelectedReceiveIds] = React.useState<string[]>([]);
  const [selectedGiveIds, setSelectedGiveIds] = React.useState<string[]>([]);

  const locale = useStickerStore((state) => state.settings.locale);
  const collectionName = useStickerStore((state) => state.selectedCollection);
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );
  const applyTrade = useStickerStore((state) => state.applyTrade);

  const displayName = sanitizeTradeDisplayName(collectionName);
  const stickerOsIndexes = React.useMemo(
    () => getStickerOsIndexesFromCollection(collectionByStickerId),
    [collectionByStickerId],
  );

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadQr() {
      try {
        const qr = await requestStickerOsQrEncode(stickerOsIndexes, controller.signal);
        setQrValue(qr);
      } catch {
        if (!controller.signal.aborted) setQrValue("");
      }
    }

    void loadQr();

    return () => controller.abort();
  }, [stickerOsIndexes]);

  const resetFlow = React.useCallback(() => {
    setStep("entry");
    setScanErrorKey(null);
    setApplyErrorKey(null);
    setResult(null);
    setSelectedReceiveIds([]);
    setSelectedGiveIds([]);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetFlow();
    onOpenChange(nextOpen);
  };

  const handleScan = React.useCallback(
    async (value: string) => {
      const parsed = await parseScannedTradeQr(value);

      if (!parsed.ok) {
        setScanErrorKey(parsed.errorKey);
        return;
      }

      const matches = buildTradeMatches({
        localMissingIds: getLocalMissingIds(collectionByStickerId),
        localDuplicateIds: getLocalDuplicateIds(collectionByStickerId),
        remoteMissingIds: parsed.missingIds,
        remoteDuplicateIds: parsed.duplicateIds,
      });

      setResult({
        remoteName: parsed.name || "",
        receiveIds: matches.receiveIds,
        giveIds: matches.giveIds,
      });
      setSelectedReceiveIds(matches.receiveIds);
      setSelectedGiveIds(matches.giveIds);
      setScanErrorKey(null);
      setApplyErrorKey(null);
      setStep("result");
    },
    [collectionByStickerId],
  );

  const toggleReceive = (id: string) => {
    setApplyErrorKey(null);
    setSelectedReceiveIds((ids) => toggleId(ids, id));
  };

  const toggleGive = (id: string) => {
    setApplyErrorKey(null);
    setSelectedGiveIds((ids) => toggleId(ids, id));
  };

  const impact = React.useMemo(
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

  const confirmTrade = () => {
    const tradeResult = applyTrade(selectedReceiveIds, selectedGiveIds);

    if (!tradeResult.ok) {
      setApplyErrorKey(
        tradeResult.reason === "stale-duplicates"
          ? "trade.error.staleDuplicates"
          : "trade.error.invalidSelection",
      );
      return;
    }

    handleOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        {step === "entry" && (
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
                    <div className="flex aspect-square w-[20%] items-center justify-center rounded-sm bg-white  ring-1 ring-white">
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

        {step === "scan" && (
          <div className="space-y-5 px-5 pb-5 pt-4">
            <DrawerHeader
              title={t(locale, "trade.scan.title")}
              description={t(locale, "trade.scan.description")}
            />
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

        {step === "result" && result && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-4">
              <DrawerHeader
                title={t(locale, "trade.comparison.title")}
                description={t(locale, "trade.comparison.description", {
                  name: remoteName,
                })}
              />

              {result.receiveIds.length === 0 && result.giveIds.length === 0 ? (
                <div className="rounded-sm border bg-card p-5 text-center">
                  <p className="text-sm font-medium">
                    {t(locale, "trade.comparison.noMatchesTitle")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(locale, "trade.comparison.noMatchesDescription")}
                  </p>
                </div>
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
                  />
                </>
              )}

              {applyErrorKey && (
                <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {t(locale, applyErrorKey)}
                </p>
              )}
            </div>

            <div className="border-t bg-card p-5">
              {result.receiveIds.length === 0 && result.giveIds.length === 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="pill"
                  className="w-full shadow-none"
                  onClick={() => setStep("scan")}
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
      </DrawerContent>
    </Drawer>
  );
}

function DrawerHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
      <DrawerDescription className="mt-1 text-sm text-muted-foreground">
        {description}
      </DrawerDescription>
    </div>
  );
}

function TradeSection({
  title,
  detail,
  stickerIds,
  selectedIds,
  onToggle,
}: {
  title: string;
  detail: string;
  stickerIds: string[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const selected = new Set(selectedIds);

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-primary">
          {selectedIds.length}/{stickerIds.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 min-[430px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8">
        {stickerIds.map((id) => (
          <TradeStickerCard
            key={id}
            stickerId={id}
            selected={selected.has(id)}
            onToggle={() => onToggle(id)}
          />
        ))}
      </div>
    </section>
  );
}

function SummaryList({ title, ids }: { title: string; ids: string[] }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {ids.map((id) => stickersById[id]?.code ?? id).join(", ")}
      </p>
    </div>
  );
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id)
    ? ids.filter((candidate) => candidate !== id)
    : [...ids, id];
}

type StickerOsIndexes = {
  ownedIndexes: number[];
  duplicateIndexes: number[];
};

type StickerOsDecodeResponse = {
  format: "stickeros";
  ownedIndexes: number[];
  duplicateIndexes: number[];
};

type ParsedScannedTradeQr =
  | {
      ok: true;
      name: string;
      missingIds: string[];
      duplicateIds: string[];
    }
  | {
      ok: false;
      errorKey: TradeMessageKey;
    };

function getStickerOsIndexesFromCollection(
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

async function requestStickerOsQrEncode(
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

async function parseScannedTradeQr(value: string): Promise<ParsedScannedTradeQr> {
  const stickerOs = await requestStickerOsQrDecode(value);

  if (stickerOs.ok) {
    const owned = new Set(stickerOs.payload.ownedIndexes);

    return {
      ok: true,
      name: "",
      missingIds: stickers
        .filter((sticker) => !owned.has(sticker.stickerOsIndex))
        .map((sticker) => sticker.id),
      duplicateIds: stickerOs.payload.duplicateIndexes
        .map((index) => stickersByStickerOsIndex[index]?.id)
        .filter((id): id is string => Boolean(id)),
    };
  }

  const legacy = parseTradeQrPayload(value);

  if (!legacy.ok) {
    return { ok: false, errorKey: getTradeParseMessageKey(legacy.reason) };
  }

  return {
    ok: true,
    name: legacy.payload.name,
    missingIds: legacy.payload.missingIds,
    duplicateIds: legacy.payload.duplicateIds,
  };
}

async function requestStickerOsQrDecode(value: string): Promise<
  | { ok: true; payload: StickerOsDecodeResponse }
  | { ok: false }
> {
  try {
    const response = await fetch("/api/stickeros/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "decode", qr: value }),
    });

    if (!response.ok) return { ok: false };

    return {
      ok: true,
      payload: (await response.json()) as StickerOsDecodeResponse,
    };
  } catch {
    return { ok: false };
  }
}

function getTradeParseMessageKey(reason: TradeQrParseError): TradeMessageKey {
  switch (reason) {
    case "invalid-collection":
    case "invalid-length":
    case "invalid-hash":
      return "trade.error.invalidCollection";
    case "invalid-version":
      return "trade.error.invalidVersion";
    case "invalid-bitset":
      return "trade.error.invalidBitset";
    default:
      return "trade.error.invalidQr";
  }
}
