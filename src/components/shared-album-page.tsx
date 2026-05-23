"use client";

import { ArrowLeft, Check, ExternalLink, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlbumTabPanel } from "@/components/album-tab-panel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { OptionGroup } from "@/components/ui/option-group";
import { SummaryList } from "@/components/summary-list";
import { TradeSection } from "@/components/trade-section";
import { type AlbumTab } from "@/components/sticky-controls";
import { t } from "@/lib/i18n";
import {
  type ImportStrategy,
  applyImportStrategy,
  buildImportPreview,
  hasLocalAlbumProgress,
} from "@/lib/shared-album-import";
import { parseSharedAlbumLinkData, type SharedAlbumSnapshot } from "@/lib/shared-album-link";
import {
  fetchSharedAlbum,
  type FetchSharedAlbumResult,
} from "@/lib/share-album";
import { useStickerStore } from "@/lib/store";
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
import { toggleAllIds, toggleId } from "@/lib/trade-session";
import { cn } from "@/lib/utils";

type ViewMode =
  | "actions"
  | "exchange"
  | "import-strategy"
  | "import-confirm"
  | "viewer";

export function SharedAlbumPage({ data, shareId }: { data?: string; shareId?: string }) {
  const router = useRouter();
  const locale = useStickerStore((state) => state.settings.locale);
  const hasHydrated = useStickerStore((state) => state.hasHydrated);
  const localCollection = useStickerStore((state) => state.collectionByStickerId);
  const applyTrade = useStickerStore((state) => state.applyTrade);
  const setCollectionByStickerId = useStickerStore(
    (state) => state.setCollectionByStickerId,
  );
  const [snapshot, setSnapshot] = useState<SharedAlbumSnapshot | null>(null);
  const [loadErrorKey, setLoadErrorKey] = useState<
    | "sharedLink.error.invalid"
    | "sharedLink.error.invalidCollection"
    | "sharedLink.error.invalidVersion"
    | "sharedLink.error.invalidCompression"
    | "sharedLink.error.notFound"
    | "sharedLink.error.expired"
    | "sharedLink.error.network"
    | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("actions");
  const [viewerTab, setViewerTab] = useState<AlbumTab>("all");
  const [viewerQuery, setViewerQuery] = useState("");
  const [viewerSortMode, setViewerSortMode] = useState<"grouped" | "az">("grouped");
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>("replace");
  const [selectedReceiveIds, setSelectedReceiveIds] = useState<string[]>([]);
  const [selectedGiveIds, setSelectedGiveIds] = useState<string[]>([]);
  const [exchangeErrorKey, setExchangeErrorKey] = useState<
    | "trade.error.invalidSelection"
    | "trade.error.staleDuplicates"
    | "trade.error.staleReceive"
    | null
  >(null);
  const [exchangeUndoDialogOpen, setExchangeUndoDialogOpen] = useState(false);
  const [pendingExchangeUndo, setPendingExchangeUndo] = useState<CollectionSnapshotUndo | null>(
    null,
  );

  useEffect(() => {
    let canceled = false;

    async function loadFromShareId(id: string) {
      setIsNetworkError(false);
      if (!id) {
        setLoadErrorKey("sharedLink.error.invalid");
        setLoading(false);
        return;
      }

      const result: FetchSharedAlbumResult = await fetchSharedAlbum(id);
      if (canceled) return;

      if (result.ok) {
        setSnapshot(result.snapshot);
        setLoadErrorKey(null);
        setLoading(false);
        return;
      }

      if (result.reason === "network") {
        setIsNetworkError(true);
        setLoadErrorKey("sharedLink.error.network");
      } else {
        setLoadErrorKey(
          result.reason === "expired"
            ? "sharedLink.error.expired"
            : result.reason === "invalid"
              ? "sharedLink.error.invalid"
              : "sharedLink.error.notFound",
        );
      }
      setLoading(false);
    }

    async function loadFromLegacyData(d: string) {
      if (!d) {
        setLoadErrorKey("sharedLink.error.invalid");
        setLoading(false);
        return;
      }

      const parsed = await parseSharedAlbumLinkData(d);
      if (canceled) return;

      if (!parsed.ok) {
        setLoadErrorKey(
          parsed.reason === "invalid-collection"
            ? "sharedLink.error.invalidCollection"
            : parsed.reason === "invalid-version"
              ? "sharedLink.error.invalidVersion"
              : parsed.reason === "unsupported-compression"
                ? "sharedLink.error.invalidCompression"
                : "sharedLink.error.invalid",
        );
        setLoading(false);
        return;
      }

      setSnapshot(parsed.snapshot);
      setLoadErrorKey(null);
      setLoading(false);
    }

    if (shareId) {
      void loadFromShareId(shareId);
    } else {
      void loadFromLegacyData(data ?? "");
    }

    return () => {
      canceled = true;
    };
  }, [data, shareId]);

  const localHasProgress = useMemo(
    () => hasLocalAlbumProgress(localCollection),
    [localCollection],
  );

  const tradeMatches = useMemo(() => {
    if (!snapshot) return null;

    return buildTradeMatches({
      localMissingIds: getLocalMissingIds(localCollection),
      localDuplicateIds: getLocalDuplicateIds(localCollection),
      remoteMissingIds: snapshot.missingIds,
      remoteDuplicateIds: snapshot.duplicateIds,
    });
  }, [localCollection, snapshot]);

  const importPreview = useMemo(() => {
    if (!snapshot) return null;
    return buildImportPreview({
      localCollectionByStickerId: localCollection,
      sharedCollectionByStickerId: snapshot.collectionByStickerId,
      strategy: importStrategy,
    });
  }, [importStrategy, localCollection, snapshot]);

  const importResultCollection = useMemo(() => {
    if (!snapshot) return null;
    return applyImportStrategy({
      localCollectionByStickerId: localCollection,
      sharedCollectionByStickerId: snapshot.collectionByStickerId,
      strategy: importStrategy,
    });
  }, [importStrategy, localCollection, snapshot]);

  const exchangeImpact = useMemo(
    () => previewTradeImpact(localCollection, selectedReceiveIds, selectedGiveIds),
    [localCollection, selectedReceiveIds, selectedGiveIds],
  );

  const senderLabel = snapshot?.senderName || t(locale, "sharedLink.senderFallback");

  const snapshotDateLabel = useMemo(() => {
    if (!snapshot) return "";
    const date = new Date(snapshot.createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }, [locale, snapshot]);

  if (loading || !hasHydrated) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>{t(locale, "sharedLink.loadingTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t(locale, "sharedLink.loadingDescription")}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (loadErrorKey || !snapshot) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <EmptyState
          title={t(locale, "sharedLink.error.title")}
          description={t(locale, loadErrorKey ?? "sharedLink.error.invalid")}
          className="shadow-none"
        />
        <div className="mt-4 flex justify-center gap-2">
          {isNetworkError && shareId ? (
            <Button
              variant="secondary"
              size="pill"
              onClick={() => {
                setLoading(true);
                setSnapshot(null);
                setLoadErrorKey(null);
                setIsNetworkError(false);
                void fetchSharedAlbum(shareId).then((result) => {
                  if (result.ok) {
                    setSnapshot(result.snapshot);
                    setLoadErrorKey(null);
                  } else {
                    setIsNetworkError(result.reason === "network");
                    setLoadErrorKey(
                      result.reason === "expired"
                        ? "sharedLink.error.expired"
                        : result.reason === "invalid"
                          ? "sharedLink.error.invalid"
                          : result.reason === "not-found"
                            ? "sharedLink.error.notFound"
                            : "sharedLink.error.network",
                    );
                  }
                  setLoading(false);
                });
              }}
            >
              <RefreshCw className="size-4" />
              {t(locale, "sharedLink.retry")}
            </Button>
          ) : null}
          <Button asChild variant="secondary" size="pill">
            <Link href="/">
              <ArrowLeft className="size-4" />
              {t(locale, "sharedLink.goHome")}
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl space-y-4 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-sm">
              {t(locale, "sharedLink.snapshotBadge")}
            </Badge>
            {snapshotDateLabel ? (
              <p className="text-xs text-muted-foreground">{snapshotDateLabel}</p>
            ) : null}
          </div>
          <CardTitle className="text-lg">
            {t(locale, "sharedLink.title", { name: senderLabel })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(locale, "sharedLink.description")}
          </p>
        </CardHeader>
      </Card>

      {viewMode === "actions" ? (
        <ActionsScreen
          locale={locale}
          onChooseExchange={() => {
            setSelectedReceiveIds([]);
            setSelectedGiveIds([]);
            setExchangeErrorKey(null);
            setViewMode("exchange");
          }}
          onChooseImport={() => {
            if (localHasProgress) {
              setViewMode("import-strategy");
            } else {
              setImportStrategy("replace");
              setViewMode("import-confirm");
            }
          }}
          onChooseViewer={() => setViewMode("viewer")}
        />
      ) : null}

      {viewMode === "exchange" && tradeMatches ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2"
              onClick={() => setViewMode("actions")}
              aria-label={t(locale, "sharedLink.back")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h2 className="text-base font-semibold">
                {t(locale, "sharedLink.exchange.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(locale, "sharedLink.exchange.description")}
              </p>
            </div>
          </div>

          {tradeMatches.receiveIds.length === 0 && tradeMatches.giveIds.length === 0 ? (
            <EmptyState
              title={t(locale, "trade.comparison.noMatchesTitle")}
              description={t(locale, "trade.comparison.noMatchesDescription")}
              className="shadow-none"
            />
          ) : (
            <>
              <TradeSection
                title={t(locale, "trade.section.receive.title", {
                  count: tradeMatches.receiveIds.length,
                })}
                detail={t(locale, "sharedLink.exchange.receiveDetail", {
                  name: senderLabel,
                  count: tradeMatches.receiveIds.length,
                })}
                stickerIds={tradeMatches.receiveIds}
                selectedIds={selectedReceiveIds}
                onToggle={(id) => {
                  setExchangeErrorKey(null);
                  setSelectedReceiveIds((prev) => toggleId(prev, id));
                }}
                onToggleAll={() => {
                  setExchangeErrorKey(null);
                  setSelectedReceiveIds((prev) =>
                    toggleAllIds(prev, tradeMatches.receiveIds),
                  );
                }}
              />
              <TradeSection
                title={t(locale, "trade.section.give.title", {
                  count: tradeMatches.giveIds.length,
                })}
                detail={t(locale, "sharedLink.exchange.giveDetail", {
                  name: senderLabel,
                  count: tradeMatches.giveIds.length,
                })}
                stickerIds={tradeMatches.giveIds}
                selectedIds={selectedGiveIds}
                onToggle={(id) => {
                  setExchangeErrorKey(null);
                  setSelectedGiveIds((prev) => toggleId(prev, id));
                }}
                onToggleAll={() => {
                  setExchangeErrorKey(null);
                  setSelectedGiveIds((prev) => toggleAllIds(prev, tradeMatches.giveIds));
                }}
              />
            </>
          )}

          {exchangeErrorKey ? (
            <p className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {t(locale, exchangeErrorKey)}
            </p>
          ) : null}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full shadow-none"
                size="pill"
                disabled={selectedReceiveIds.length === 0 || selectedGiveIds.length === 0}
              >
                {t(locale, "trade.confirm.label", {
                  receive: selectedReceiveIds.length,
                  give: selectedGiveIds.length,
                })}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(locale, "trade.confirm.dialogTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t(locale, "sharedLink.exchange.confirmDescription")}
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
                  <p className="font-medium">{t(locale, "trade.albumImpact")}</p>
                  <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-sm border p-2 text-xs text-muted-foreground">
                    {exchangeImpact.map((item) => (
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
                  <Button
                    className="shadow-none"
                    onClick={() => {
                      const previousCollection = cloneCollection(localCollection);
                      const result = applyTrade(selectedReceiveIds, selectedGiveIds);
                      if (!result.ok) {
                        setExchangeErrorKey(
                          result.reason === "stale-duplicates"
                            ? "trade.error.staleDuplicates"
                            : result.reason === "stale-receive"
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

                      setSelectedReceiveIds([]);
                      setSelectedGiveIds([]);
                      setExchangeErrorKey(null);
                      setViewMode("actions");
                    }}
                  >
                    <Check className="size-4" />
                    {t(locale, "sharedLink.exchange.confirmAction")}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      ) : null}

      {viewMode === "import-strategy" ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2"
              onClick={() => setViewMode("actions")}
              aria-label={t(locale, "sharedLink.back")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h2 className="text-base font-semibold">
                {t(locale, "sharedLink.import.strategyTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(locale, "sharedLink.import.strategyDescription")}
              </p>
            </div>
          </div>

          <OptionGroup
            options={[
              {
                value: "replace",
                label: t(locale, "sharedLink.import.strategy.replace"),
              },
              {
                value: "add",
                label: t(locale, "sharedLink.import.strategy.add"),
              },
              {
                value: "highest",
                label: t(locale, "sharedLink.import.strategy.highest"),
              },
            ]}
            value={importStrategy}
            onChange={(value) => setImportStrategy(value)}
            columns={1}
            buttonClassName="w-full rounded-sm border px-3 py-3 text-left text-sm font-medium"
          />

          <p
            className={cn(
              "rounded-sm border p-3 text-xs",
              importStrategy === "replace" && "border-destructive/35 bg-destructive/10 text-destructive",
              importStrategy === "add" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              importStrategy === "highest" && "border-primary/35 bg-primary/10 text-primary",
            )}
          >
            {importStrategy === "replace"
              ? t(locale, "sharedLink.import.warning.replace")
              : importStrategy === "add"
                ? t(locale, "sharedLink.import.warning.add")
                : t(locale, "sharedLink.import.warning.highest")}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="pill" onClick={() => setViewMode("actions")}>
              {t(locale, "sharedLink.import.cancel")}
            </Button>
            <Button size="pill" onClick={() => setViewMode("import-confirm")}>
              {t(locale, "sharedLink.import.continue")}
            </Button>
          </div>
        </section>
      ) : null}

      {viewMode === "import-confirm" && importPreview && importResultCollection ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2"
              onClick={() => setViewMode(localHasProgress ? "import-strategy" : "actions")}
              aria-label={t(locale, "sharedLink.back")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h2 className="text-base font-semibold">
                {t(locale, "sharedLink.import.confirmTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(locale, "sharedLink.import.confirmDescription")}
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <SummaryRow
                label={t(locale, "sharedLink.summary.localCollected")}
                value={importPreview.current.collected}
              />
              <SummaryRow
                label={t(locale, "sharedLink.summary.sharedCollected")}
                value={importPreview.shared.collected}
              />
              <SummaryRow
                label={t(locale, "sharedLink.summary.resultCollected")}
                value={importPreview.result.collected}
              />
              <SummaryRow
                label={t(locale, "sharedLink.summary.localDuplicates")}
                value={importPreview.current.duplicateCopies}
              />
              <SummaryRow
                label={t(locale, "sharedLink.summary.sharedDuplicates")}
                value={importPreview.shared.duplicateCopies}
              />
              <SummaryRow
                label={t(locale, "sharedLink.summary.resultDuplicates")}
                value={importPreview.result.duplicateCopies}
              />
              <SummaryRow
                label={t(locale, "sharedLink.summary.localCompletion")}
                value={`${importPreview.current.completion}%`}
              />
              <SummaryRow
                label={t(locale, "sharedLink.summary.resultCompletion")}
                value={`${importPreview.result.completion}%`}
              />
            </CardContent>
          </Card>

          <p className="rounded-sm border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            {t(locale, "sharedLink.import.finalWarning")}
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="pill" className="w-full shadow-none">
                <Check className="size-4" />
                {t(locale, "sharedLink.import.apply")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(locale, "sharedLink.import.dialogTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t(locale, "sharedLink.import.dialogDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="secondary">{t(locale, "common.cancel")}</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    onClick={() => {
                      setCollectionByStickerId(importResultCollection);
                      sessionStorage.setItem("stickeros-import-success", "1");
                      router.push("/");
                    }}
                  >
                    {t(locale, "sharedLink.import.apply")}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      ) : null}

      {viewMode === "viewer" ? (
        <ViewerSection
          locale={locale}
          snapshot={snapshot}
          viewerTab={viewerTab}
          viewerQuery={viewerQuery}
          viewerSortMode={viewerSortMode}
          onChangeTab={setViewerTab}
          onChangeQuery={setViewerQuery}
          onToggleSort={() =>
            setViewerSortMode((m) => (m === "grouped" ? "az" : "grouped"))
          }
          onBack={() => setViewMode("actions")}
        />
      ) : null}

      <div className="pt-2">
        <Button asChild variant="ghost" size="pill">
          <Link href="/">
            <ExternalLink className="size-4" />
            {t(locale, "sharedLink.openMainApp")}
          </Link>
        </Button>
      </div>
      <AlertDialog
        open={exchangeUndoDialogOpen}
        onOpenChange={setExchangeUndoDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(locale, "toast.exchange.undoTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingExchangeUndo &&
              hasCollectionChangedSinceExpected({
                currentCollection: localCollection,
                expectedCurrentCollection: pendingExchangeUndo.expectedCurrentCollection,
              })
                ? t(locale, "toast.exchange.undoOverwriteDescription")
                : t(locale, "toast.exchange.undoDescription")}
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
    </main>
  );
}

function ActionsScreen({
  locale,
  onChooseExchange,
  onChooseImport,
  onChooseViewer,
}: {
  locale: "en" | "es";
  onChooseExchange: () => void;
  onChooseImport: () => void;
  onChooseViewer: () => void;
}) {
  return (
    <section className="space-y-3">
      <ActionCard
        title={t(locale, "sharedLink.actions.exchange")}
        description={t(locale, "sharedLink.actions.exchangeDescription")}
        onClick={onChooseExchange}
      />
      <ActionCard
        title={t(locale, "sharedLink.actions.import")}
        description={t(locale, "sharedLink.actions.importDescription")}
        onClick={onChooseImport}
      />
      <ActionCard
        title={t(locale, "sharedLink.actions.view")}
        description={t(locale, "sharedLink.actions.viewDescription")}
        onClick={onChooseViewer}
      />
    </section>
  );
}

function ActionCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full rounded-sm border bg-card p-4 text-left transition-colors hover:bg-accent"
      onClick={onClick}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border bg-muted/35 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ViewerSection({
  locale,
  snapshot,
  viewerTab,
  viewerQuery,
  viewerSortMode,
  onChangeTab,
  onChangeQuery,
  onToggleSort,
  onBack,
}: {
  locale: "en" | "es";
  snapshot: SharedAlbumSnapshot;
  viewerTab: AlbumTab;
  viewerQuery: string;
  viewerSortMode: "grouped" | "az";
  onChangeTab: (tab: AlbumTab) => void;
  onChangeQuery: (query: string) => void;
  onToggleSort: () => void;
  onBack: () => void;
}) {
  const viewerTabs = useMemo<
    readonly { id: AlbumTab; label: string }[]
  >(
    () => [
      { id: "all", label: t(locale, "album.tab.all") },
      { id: "missing", label: t(locale, "album.tab.missing") },
      { id: "duplicates", label: t(locale, "album.tab.duplicates") },
      { id: "collected", label: t(locale, "collection.collected") },
    ],
    [locale],
  );

  const viewerTabIndex = useMemo(
    () => Math.max(0, viewerTabs.findIndex((t) => t.id === viewerTab)),
    [viewerTab, viewerTabs],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2"
          onClick={onBack}
          aria-label={t(locale, "sharedLink.back")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h2 className="text-base font-semibold">
            {t(locale, "sharedLink.viewer.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(locale, "sharedLink.viewer.description")}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-2 p-4 text-sm">
          <SummaryRow
            label={t(locale, "sharedLink.summary.sharedCollected")}
            value={snapshot.stats.collected}
          />
          <SummaryRow
            label={t(locale, "collection.missing")}
            value={snapshot.stats.missing}
          />
          <SummaryRow
            label={t(locale, "collection.duplicates")}
            value={snapshot.stats.duplicateCopies}
          />
          <SummaryRow
            label={t(locale, "collection.percent")}
            value={`${snapshot.stats.completion}%`}
          />
        </CardContent>
      </Card>

      <AnimatedTabs
        tabs={viewerTabs}
        activeTab={viewerTab}
        onTabChange={onChangeTab}
        className="grid-cols-4"
      />

      <div className="grid grid-cols-[1fr_3.5rem] gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={viewerQuery}
            onChange={(e) => onChangeQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && viewerQuery) {
                e.preventDefault();
                onChangeQuery("");
              }
            }}
            placeholder={t(locale, "common.searchPlaceholder")}
            className="h-12 pl-10 pr-10 shadow-none"
          />
          {viewerQuery.length > 0 && (
            <button
              type="button"
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:bg-accent"
              onClick={() => onChangeQuery("")}
              aria-label={t(locale, "common.clearSearch")}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-12 w-full shadow-none",
            viewerSortMode === "az" &&
              "border-primary/45 bg-primary/10 text-primary",
          )}
          onClick={onToggleSort}
          aria-label={
            viewerSortMode === "grouped"
              ? t(locale, "filters.sort.alphabetical")
              : t(locale, "filters.sort.grouped")
          }
        >
          <SlidersHorizontal className="size-5" />
        </Button>
      </div>

      <AlbumTabPanel
        activeTabIndex={viewerTabIndex}
        onTabChange={(index) => {
          const tab = viewerTabs[index];
          if (tab) onChangeTab(tab.id);
        }}
        collectionByStickerId={snapshot.collectionByStickerId}
        locale={locale}
        query={viewerQuery}
        sortMode={viewerSortMode}
        readOnly
        tabs={viewerTabs}
      />
    </section>
  );
}
