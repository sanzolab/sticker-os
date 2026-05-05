"use client";

import * as React from "react";
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
import { stickersById } from "@/lib/sticker-data";
import { useStickerStore } from "@/lib/store";
import {
  buildTradeMatches,
  getLocalDuplicateIds,
  getLocalMissingIds,
  previewTradeImpact,
} from "@/lib/trade";
import {
  buildTradeQrPayload,
  parseTradeQrPayload,
  sanitizeTradeDisplayName,
  serializeTradeQrPayload,
  type TradeQrParseError,
} from "@/lib/trade-qr";
import { TradeScanner } from "./trade-scanner";
import { TradeStickerCard } from "./trade-sticker-card";

type TradeStep = "entry" | "scan" | "result";

type TradeResult = {
  remoteName: string;
  receiveIds: string[];
  giveIds: string[];
};

export function TradeDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = React.useState<TradeStep>("entry");
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<TradeResult | null>(null);
  const [selectedReceiveIds, setSelectedReceiveIds] = React.useState<string[]>([]);
  const [selectedGiveIds, setSelectedGiveIds] = React.useState<string[]>([]);

  const collectionName = useStickerStore((state) => state.selectedCollection);
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );
  const applyTrade = useStickerStore((state) => state.applyTrade);

  const displayName = sanitizeTradeDisplayName(collectionName);
  const qrValue = React.useMemo(
    () =>
      serializeTradeQrPayload(
        buildTradeQrPayload(collectionName, collectionByStickerId),
      ),
    [collectionByStickerId, collectionName],
  );

  const resetFlow = React.useCallback(() => {
    setStep("entry");
    setScanError(null);
    setApplyError(null);
    setResult(null);
    setSelectedReceiveIds([]);
    setSelectedGiveIds([]);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetFlow();
    onOpenChange(nextOpen);
  };

  const handleScan = React.useCallback(
    (value: string) => {
      const parsed = parseTradeQrPayload(value);

      if (!parsed.ok) {
        setScanError(getTradeParseMessage(parsed.reason));
        return;
      }

      const matches = buildTradeMatches({
        localMissingIds: getLocalMissingIds(collectionByStickerId),
        localDuplicateIds: getLocalDuplicateIds(collectionByStickerId),
        remoteMissingIds: parsed.payload.missingIds,
        remoteDuplicateIds: parsed.payload.duplicateIds,
      });

      setResult({
        remoteName: parsed.payload.name || "Collector",
        receiveIds: matches.receiveIds,
        giveIds: matches.giveIds,
      });
      setSelectedReceiveIds(matches.receiveIds);
      setSelectedGiveIds(matches.giveIds);
      setScanError(null);
      setApplyError(null);
      setStep("result");
    },
    [collectionByStickerId],
  );

  const toggleReceive = (id: string) => {
    setApplyError(null);
    setSelectedReceiveIds((ids) => toggleId(ids, id));
  };

  const toggleGive = (id: string) => {
    setApplyError(null);
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

  const confirmLabel = `Confirm Trade (${selectedReceiveIds.length} for ${selectedGiveIds.length})`;

  const confirmTrade = () => {
    const tradeResult = applyTrade(selectedReceiveIds, selectedGiveIds);

    if (!tradeResult.ok) {
      setApplyError(
        tradeResult.reason === "stale-duplicates"
          ? "Your duplicates changed. Review this trade before trying again."
          : "Select at least one sticker to receive and one to give.",
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
                Trade stickers
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-muted-foreground">
                Share your missing and duplicate stickers with another collector.
              </DrawerDescription>
            </div>

            <div className="mx-auto grid max-w-64 place-items-center rounded-sm border bg-white p-5">
              <QRCode
                value={qrValue}
                size={224}
                bgColor="#ffffff"
                fgColor="#111827"
                className="h-auto w-full"
              />
            </div>

            <Button
              type="button"
              size="pill"
              className="w-full shadow-none"
              onClick={() => setStep("scan")}
            >
              <ScanLine className="size-4" />
              Scan QR
            </Button>
          </div>
        )}

        {step === "scan" && (
          <div className="space-y-5 px-5 pb-5 pt-4">
            <DrawerHeader
              title="Scan trade QR"
              description="Compare collections locally from another StickerOS QR."
            />
            <TradeScanner onScan={handleScan} />
            {scanError && (
              <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {scanError}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="pill"
              className="w-full shadow-none"
              onClick={() => {
                setScanError(null);
                setStep("entry");
              }}
            >
              <ArrowLeft className="size-4" />
              Back to my QR
            </Button>
          </div>
        )}

        {step === "result" && result && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-4">
              <DrawerHeader
                title="Trade comparison"
                description={`Matched with ${result.remoteName}. Choose what to exchange.`}
              />

              {result.receiveIds.length === 0 && result.giveIds.length === 0 ? (
                <div className="rounded-sm border bg-card p-5 text-center">
                  <p className="text-sm font-medium">No trade matches found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your duplicate and missing lists do not overlap yet.
                  </p>
                </div>
              ) : (
                <>
                  <TradeSection
                    title="What you can receive"
                    detail={`${result.remoteName} has ${result.receiveIds.length} stickers you need.`}
                    stickerIds={result.receiveIds}
                    selectedIds={selectedReceiveIds}
                    onToggle={toggleReceive}
                  />
                  <TradeSection
                    title="What you can give"
                    detail={`You have ${result.giveIds.length} stickers ${result.remoteName} needs.`}
                    stickerIds={result.giveIds}
                    selectedIds={selectedGiveIds}
                    onToggle={toggleGive}
                  />
                </>
              )}

              {applyError && (
                <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {applyError}
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
                  Scan another QR
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
                      <AlertDialogTitle>Confirm Trade?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Review the sticker count changes before updating your album.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-3 text-sm">
                      <SummaryList title="You'll receive" ids={selectedReceiveIds} />
                      <SummaryList title="You'll give" ids={selectedGiveIds} />
                      <div>
                        <p className="font-medium">Album impact</p>
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
                          Cancel
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
          <h3 className="text-sm font-semibold">
            {title} {selectedIds.length}
          </h3>
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

function getTradeParseMessage(reason: TradeQrParseError) {
  switch (reason) {
    case "invalid-collection":
    case "invalid-length":
    case "invalid-hash":
      return "This QR was created for a different StickerOS collection.";
    case "invalid-version":
      return "This QR was created by an unsupported StickerOS trade version.";
    case "invalid-bitset":
      return "This QR contains unreadable collection data.";
    default:
      return "This does not look like a valid StickerOS trade QR.";
  }
}
