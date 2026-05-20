"use client";

import { ArrowLeft, TriangleAlert, History} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
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
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DrawerHeader } from "@/components/drawer-header";
import { TradeScanner } from "@/components/trade-scanner";
import {
  parseExchangeQrForMigration,
  type AlbumMigrationResult,
} from "@/lib/album-migration";
import { t } from "@/lib/i18n";
import { useStickerStore } from "@/lib/store";

type MigrationStep = "intro" | "scan" | "review";

export function AlbumMigrationDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<MigrationStep>("intro");
  const [scanError, setScanError] = useState(false);
  const [migrationResult, setMigrationResult] =
    useState<AlbumMigrationResult | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  const locale = useStickerStore((state) => state.settings.locale);
  const setCollectionByStickerId = useStickerStore(
    (state) => state.setCollectionByStickerId,
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setStep("intro");
        setScanError(false);
        setMigrationResult(null);
        scanAbortRef.current?.abort();
        scanAbortRef.current = null;
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleScan = useCallback(
    async (value: string) => {
      if (scanAbortRef.current) {
        scanAbortRef.current.abort();
      }

      const controller = new AbortController();
      scanAbortRef.current = controller;

      const parsed = await parseExchangeQrForMigration(value, controller.signal);

      if (controller.signal.aborted) return;
      scanAbortRef.current = null;

      if (!parsed.ok) {
        setScanError(true);
        setMigrationResult(null);
        toast.error(t(locale, "migration.error.invalidQr"));
        return;
      }

      setScanError(false);
      setMigrationResult(parsed.result);
      setStep("review");
      toast.success(t(locale, "toast.scan.success"));
    },
    [locale],
  );

  const applyMigration = useCallback(() => {
    if (!migrationResult) return;
    setCollectionByStickerId(migrationResult.collectionByStickerId);
    toast.success(t(locale, "toast.migration.completed"));
    handleOpenChange(false);
  }, [handleOpenChange, locale, migrationResult, setCollectionByStickerId]);

  return (
    <AppDrawer open={open} onOpenChange={handleOpenChange}>
      {step === "intro" && (
        <div className="space-y-5">
          <DrawerHeader
            title={t(locale, "migration.title")}
            description={t(locale, "migration.description")}
          />

          <div
            className="rounded-sm border  border-amber-500/35 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 text-sm "
            role="alert"
          >
            <p className="font-medium inline-flex items-center gap-2"><TriangleAlert className="size-4" />{t(locale, "migration.warning.replace")}</p>
            <p className="mt-1 inline-flex items-center gap-2"><History className="size-4" />{t(locale, "migration.warning.loss")}</p>
          </div>

          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-medium">{t(locale, "migration.warning.duplicatesTitle")}</p>
              <p className="text-muted-foreground">
                {t(locale, "migration.warning.duplicatesBody")}
              </p>
            </CardContent>
          </Card>

          <Button
            size="pill"
            className="w-full shadow-none"
            onClick={() => setStep("scan")}
          >
            {t(locale, "migration.startScan")}
          </Button>
        </div>
      )}

      {step === "scan" && (
        <div className="space-y-5">
          <div className="flex items-start gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 -ml-2"
              onClick={() => setStep("intro")}
              aria-label={t(locale, "migration.back")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <DrawerHeader
                title={t(locale, "migration.scanTitle")}
                description={t(locale, "migration.scanDescription")}
              />
            </div>
          </div>

          <TradeScanner onScan={handleScan} />

          {scanError && (
            <p
              className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {t(locale, "migration.error.invalidQr")}
            </p>
          )}
        </div>
      )}

      {step === "review" && migrationResult && (
        <div className="space-y-5">
          <div className="flex items-start gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 -ml-2"
              onClick={() => setStep("scan")}
              aria-label={t(locale, "migration.back")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <DrawerHeader
                title={t(locale, "migration.reviewTitle")}
                description={t(locale, "migration.reviewDescription")}
              />
            </div>
          </div>

          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <SummaryRow
                label={t(locale, "migration.summary.collected")}
                value={migrationResult.summary.collectedCount}
              />
              <SummaryRow
                label={t(locale, "migration.summary.duplicates")}
                value={migrationResult.summary.duplicateStickerCount}
              />
              {migrationResult.summary.ignoredStickerCount > 0 && (
                <SummaryRow
                  label={t(locale, "migration.summary.ignored")}
                  value={migrationResult.summary.ignoredStickerCount}
                />
              )}
            </CardContent>
          </Card>

          <div className="rounded-sm border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            <p className="inline-flex items-center gap-2 font-medium">
              <TriangleAlert className="size-4" />
              {t(locale, "migration.warning.duplicatesTitle")}
            </p>
            <p className="mt-2">{t(locale, "migration.warning.duplicatesBody")}</p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="pill"
                className="w-full shadow-none"
                variant="default"
              >
                {t(locale, "migration.confirmAction")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t(locale, "migration.confirmTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t(locale, "migration.confirmDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="secondary" className="shadow-none">
                    {t(locale, "common.cancel")}
                  </Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    variant="default"
                    className="shadow-none"
                    onClick={applyMigration}
                  >
                    {t(locale, "migration.confirmAction")}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </AppDrawer>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
