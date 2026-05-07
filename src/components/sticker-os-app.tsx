"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  Copy,
  Download,
  Repeat2,
  RotateCcw,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useTheme } from "next-themes";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  buildTxtExportByKind,
  getExportMeta,
  stickerExportOptions,
  type ExportKind,
} from "@/lib/export";
import { localeOptions, t, type Locale, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  getStickerCopies,
  getStickerGroupLabel,
  getStickerSearchValues,
  normalizeStickerSearchText,
  stickerGroups,
  stickers,
  type Sticker,
  type StickerGroup,
} from "@/lib/sticker-data";
import {
  type ThemePreference,
  useCollectionStats,
  useStickerStore,
} from "@/lib/store";
import { DuplicateEditor } from "./duplicate-editor";
import { StickerCard } from "./sticker-card";
import { DataGrid } from "./data-grid";
import { TradeDrawer } from "./trade-drawer";

type AlbumTab = "all" | "missing" | "duplicates" | "special";
type SortMode = "grouped" | "az";
type StatsTab = "summary" | "teams";
type TeamSortMode = "most" | "least";
type TabTransitionDirection = "left" | "right";

const albumTabs = [
  { id: "all", labelKey: "album.tab.all" },
  { id: "missing", labelKey: "album.tab.missing" },
  { id: "duplicates", labelKey: "album.tab.duplicates" },
  { id: "special", labelKey: "album.tab.special" },
] as const satisfies readonly {
  id: AlbumTab;
  labelKey: TranslationKey;
  }[];

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function StickerOSApp() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [tradeOpen, setTradeOpen] = React.useState(false);
  const [visitedTabs, setVisitedTabs] = React.useState<AlbumTab[]>(["all"]);
  const [sortMode, setSortMode] = React.useState<SortMode>("grouped");
  const [activeTab, setActiveTab] = React.useState<AlbumTab>("all");
  const [tabTransitionDirection, setTabTransitionDirection] =
    React.useState<TabTransitionDirection>("right");
  const [hasChangedTab, setHasChangedTab] = React.useState(false);
  const [duplicateEditorSticker, setDuplicateEditorSticker] =
    React.useState<Sticker | null>(null);
  const [shareState, setShareState] = React.useState<
    "idle" | "copied" | "downloaded"
  >("idle");
  const collectionName = useStickerStore((state) => state.selectedCollection);
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );
  const query = useStickerStore((state) => state.searchQuery);
  const setQuery = useStickerStore((state) => state.setSearchQuery);
  const locale = useStickerStore((state) => state.settings.locale);
  const stats = useCollectionStats();

  const handleEditDuplicates = React.useCallback((sticker: Sticker) => {
    setDuplicateEditorSticker(sticker);
  }, []);

  const handleDuplicateEditorOpenChange = React.useCallback((open: boolean) => {
    if (!open) setDuplicateEditorSticker(null);
  }, []);
  const handleShareOpen = React.useCallback(() => {
    setShareOpen(true);
  }, []);
  const handleTradeOpen = React.useCallback(() => {
    setTradeOpen(true);
  }, []);
  const handleSettingsOpen = React.useCallback(() => {
    setSettingsOpen(true);
  }, []);
  const handleStatsOpen = React.useCallback(() => {
    setStatsOpen(true);
  }, []);
  const handleSortToggle = React.useCallback(() => {
    setSortMode((mode) => (mode === "grouped" ? "az" : "grouped"));
  }, []);

  const handleTabChange = React.useCallback((tab: AlbumTab) => {
    if (tab === activeTab) return;

    const currentIndex = albumTabs.findIndex((item) => item.id === activeTab);
    const nextIndex = albumTabs.findIndex((item) => item.id === tab);

    setTabTransitionDirection(
      nextIndex > currentIndex ? "right" : "left",
    );
    setVisitedTabs((tabs) => (tabs.includes(tab) ? tabs : [...tabs, tab]));
    setActiveTab(tab);
    setHasChangedTab(true);
  }, [activeTab]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <TopBar
        collectionName={collectionName}
        shareState={shareState}
        onShare={handleShareOpen}
        onTrade={handleTradeOpen}
        onSettings={handleSettingsOpen}
      />
      <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-[4.75rem] sm:px-6 lg:px-8">
        <section className="mb-8  border rounded-sm divide-y">
          <CollectionHeader stats={stats} onViewMore={handleStatsOpen} />
        </section>

        <StickyControls
          activeTab={activeTab}
          query={query}
          sortMode={sortMode}
          onQueryChange={setQuery}
          onSortToggle={handleSortToggle}
          onTabChange={handleTabChange}
        />

        <section className="tabs-content-wrapper min-h-[calc(100dvh-8rem)] bg-background pt-4">
          {visitedTabs.map((tab) => (
            <AlbumTabPanel
              key={tab}
              tab={tab}
              active={tab === activeTab}
              direction={tabTransitionDirection}
              collectionByStickerId={collectionByStickerId}
              locale={locale}
              query={query}
              sortMode={sortMode}
              onEditDuplicates={handleEditDuplicates}
              hasChangedTab={hasChangedTab}
            />
          ))}
        </section>
      </div>

      {duplicateEditorSticker && (
        <DuplicateEditor
          sticker={duplicateEditorSticker}
          open
          onOpenChange={handleDuplicateEditorOpenChange}
        />
      )}

      <SettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        collectionName={collectionName}
        collectionByStickerId={collectionByStickerId}
      />
      <ShareDrawer
        open={shareOpen}
        onOpenChange={setShareOpen}
        collectionName={collectionName}
        collectionByStickerId={collectionByStickerId}
        onShareStateChange={setShareState}
      />
      <TradeDrawer open={tradeOpen} onOpenChange={setTradeOpen} />
      <StatsDrawer
        open={statsOpen}
        onOpenChange={setStatsOpen}
        collectionByStickerId={collectionByStickerId}
        stats={stats}
      />
    </main>
  );
}

const TopBar = React.memo(function TopBar({
  collectionName,
  shareState,
  onShare,
  onTrade,
  onSettings,
}: {
  collectionName: string;
  shareState: "idle" | "copied" | "downloaded";
  onShare: () => void;
  onTrade: () => void;
  onSettings: () => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <header className="fixed inset-x-0 top-0 z-40  bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button className="inline-flex items-center gap-1 rounded-sm px-0.5 py-2 text-xl font-semibold tracking-normal transition-transform active:scale-[0.99] sm:text-2xl">
          {collectionName}
          {/* <ChevronDown className="mt-0.5 size-5 text-muted-foreground" /> */}
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-sm shadow-none"
            onClick={onShare}
            aria-label={t(locale, "topbar.shareAria")}
          >
            <Share2 className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-sm shadow-none"
            onClick={onTrade}
            aria-label={t(locale, "topbar.tradeAria")}
          >
            <Repeat2 className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-sm shadow-none"
            onClick={onSettings}
            aria-label={t(locale, "topbar.settingsAria")}
          >
            <Settings className="size-5" />
          </Button>
        </div>
      </div>
      {shareState !== "idle" && (
        <div className="absolute right-14 top-12 rounded-sm border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          {shareState === "copied"
            ? t(locale, "topbar.shareStatus.copied")
            : t(locale, "topbar.shareStatus.downloaded")}
        </div>
      )}
    </header>
  );
});

const CollectionHeader = React.memo(function CollectionHeader({
  stats,
  onViewMore,
}: {
  stats: ReturnType<typeof useCollectionStats>;
  onViewMore: () => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <>
      <div className="w-full">
        <div className="min-w-0">
          <div className="grid grid-cols-3 divide-x">
            <div className="px-4 grid place-items-center p-4 md:p-6">
              <ProgressRing value={stats.completion} size="default" />
            </div>
            <div className="min-w-0 px-4 grid place-items-center p-4 md:p-6">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground text-center">
                {t(locale, "collection.progressLabel")}
              </p>
              <p className="mt-2 text-lg font-medium leading-none tracking-normal sm:text-3xl">
                {stats.collected}/{stats.total}
              </p>
            </div>

            <div className="grid place-items-center p-4 md:p-6">
              <button
                type="button"
                onClick={onViewMore}
                className="shrink-0 pt-1 text-sm font-medium text-primary inline-flex items-center gap-1 transition-opacity hover:opacity-80 px-4"
              >
                {t(locale, "collection.viewMore")}
                <ChevronRight className="mt-0.5 size-5 " />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="w-ful grid grid-cols-4 divide-x text-center">
        <HeaderMetric
          icon={<CircleDot className="size-5 text-primary" />}
          label={t(locale, "collection.collected")}
          value={stats.collected}
        />
        <HeaderMetric
          icon={<CircleDot className="size-5 text-foreground" />}
          label={t(locale, "collection.missing")}
          value={stats.missing}
        />
        <HeaderMetric
          icon={<Trophy className="size-5 text-amber-500" />}
          label={t(locale, "collection.duplicates")}
          value={stats.duplicateCopies}
        />
        <HeaderMetric
          icon={<Sparkles className="size-5 text-yellow-400" />}
          label={t(locale, "collection.special")}
          value={`${stats.specialCollected}/${stats.specialTotal}`}
        />
      </div>
    </>
  );
});

function HeaderMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 p-4 md:p-6">
      {icon}
      <p className="text-xl font-medium leading-none tracking-normal">
        {value}
      </p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const StickyControls = React.memo(function StickyControls({
  activeTab,
  query,
  sortMode,
  onQueryChange,
  onSortToggle,
  onTabChange,
}: {
  activeTab: AlbumTab;
  query: string;
  sortMode: SortMode;
  onQueryChange: (query: string) => void;
  onSortToggle: () => void;
  onTabChange: (tab: AlbumTab) => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <section className="sticky top-14 z-30 -mx-4  bg-background px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="relative grid grid-cols-4">
        {albumTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "h-12 text-sm font-medium text-muted-foreground transition-colors",
              activeTab === tab.id && "text-primary",
            )}
          >
            {t(locale, tab.labelKey)}
          </button>
        ))}

        {/* indicador tipo imán */}
        <span
          className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-out"
          style={{
            width: `${100 / albumTabs.length}%`,
            transform: `translateX(${
              albumTabs.findIndex((t) => t.id === activeTab) * 100
            }%)`,
          }}
        />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_3.5rem] gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t(locale, "common.searchPlaceholder")}
            className="h-12 pl-10 text-base shadow-none"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-12 w-full shadow-none",
            sortMode === "az" && "border-primary/45 bg-primary/10 text-primary",
          )}
          onClick={onSortToggle}
          aria-label={
            sortMode === "grouped"
              ? t(locale, "filters.sort.alphabetical")
              : t(locale, "filters.sort.grouped")
          }
          title={
            sortMode === "grouped"
              ? t(locale, "filters.sort.alphabetical")
              : t(locale, "filters.sort.grouped")
          }
        >
          <SlidersHorizontal className="size-5" />
        </Button>
      </div>
    </section>
  );
});

type StickerSectionViewModel = {
  group: StickerGroup;
  stickers: Sticker[];
  missing: number;
  duplicates: number;
};

const AlbumTabPanel = React.memo(
  function AlbumTabPanel({
    tab,
    active,
    direction,
    collectionByStickerId,
    locale,
    query,
    sortMode,
    onEditDuplicates,
    hasChangedTab,
  }: {
    tab: AlbumTab;
    active: boolean;
    direction: TabTransitionDirection;
    collectionByStickerId: Record<string, number>;
    locale: Locale;
    query: string;
    sortMode: SortMode;
    onEditDuplicates: (sticker: Sticker) => void;
    hasChangedTab: boolean;
  }) {
    const sections = React.useMemo(
      () =>
        buildStickerSections({
          activeTab: tab,
          collectionByStickerId,
          locale,
          query,
          sortMode,
        }),
      [collectionByStickerId, locale, query, sortMode, tab],
    );

    return (
      <section
        hidden={!active}
        data-direction={direction}
        className={cn(
          "tabs-content space-y-4 bg-background",
          active && hasChangedTab ? "tabs-content-active" : "",
        )}
      >
        {sections.map(
          (
            { group, stickers: groupStickers, missing, duplicates },
            sectionIndex,
          ) => (
            <StickerSection
              key={group.id}
              active={active}
              group={group}
              stickers={groupStickers}
              missing={missing}
              duplicates={duplicates}
              sectionIndex={sectionIndex}
              onEditDuplicates={onEditDuplicates}
            />
          ),
        )}

        {sections.length === 0 && (
          <Card className="shadow-none">
            <CardContent className="flex min-h-32 flex-col items-center justify-center p-5 text-center">
              <p className="text-sm font-medium">
                {t(locale, "album.empty.title")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(locale, "album.empty.description")}
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    );
  },
  (prev, next) => {
    if (!prev.active && !next.active) return true;

    return (
      prev.active === next.active &&
      prev.tab === next.tab &&
      prev.collectionByStickerId === next.collectionByStickerId &&
      prev.locale === next.locale &&
      prev.query === next.query &&
      prev.sortMode === next.sortMode &&
      prev.onEditDuplicates === next.onEditDuplicates
    );
  },
);

function buildStickerSections({
  activeTab,
  collectionByStickerId,
  locale,
  query,
  sortMode,
}: {
  activeTab: AlbumTab;
  collectionByStickerId: Record<string, number>;
  locale: Locale;
  query: string;
  sortMode: SortMode;
}): StickerSectionViewModel[] {
  const normalizedQuery = normalizeStickerSearchText(query.trim());
  const sectionsByGroupId = new Map<string, StickerSectionViewModel>();

  for (const group of stickerGroups) {
    sectionsByGroupId.set(group.id, {
      group,
      stickers: [],
      missing: 0,
      duplicates: 0,
    });
  }

  for (const sticker of stickers) {
    const copies = getStickerCopies(collectionByStickerId, sticker.id);
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "missing" && copies === 0) ||
      (activeTab === "duplicates" && copies > 1) ||
      (activeTab === "special" && sticker.special);

    if (!matchesTab) continue;
    if (
      normalizedQuery &&
      !matchesStickerQuery(sticker, normalizedQuery, locale)
    ) {
      continue;
    }

    const section = sectionsByGroupId.get(sticker.groupId);
    if (!section) continue;

    section.stickers.push(sticker);

    if (copies === 0) section.missing += 1;
    if (copies > 1) section.duplicates += copies - 1;
  }

  const sections = stickerGroups
    .map((group) => sectionsByGroupId.get(group.id))
    .filter((section): section is StickerSectionViewModel =>
      Boolean(section && section.stickers.length > 0),
    );

  if (sortMode === "grouped") return sections;

  return [...sections].sort((a, b) =>
    getStickerGroupLabel(a.group, locale).localeCompare(
      getStickerGroupLabel(b.group, locale),
    ),
  );
}

function matchesStickerQuery(
  sticker: Sticker,
  normalizedQuery: string,
  locale: Locale,
) {
  return getStickerSearchValues(sticker, locale)
    .some((value) =>
      normalizeStickerSearchText(value).includes(normalizedQuery),
    );
}

function useLazySection(enabled: boolean) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const revealedRef = React.useRef(false);

  const [shouldRender, setShouldRender] = React.useState(false);
  const [enter, setEnter] = React.useState(false);

  const scheduleEnter = React.useCallback(() => {
    if (enter || rafRef.current !== null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      setEnter(true);
    });
  }, [enter]);

  const reveal = React.useCallback((animate: boolean) => {
    if (revealedRef.current) return;

    revealedRef.current = true;
    setShouldRender(true);

    if (!animate) {
      setEnter(true);
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!enabled || !shouldRender || enter) return;

    scheduleEnter();
  }, [enabled, enter, scheduleEnter, shouldRender]);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;

    if (!enabled || shouldRender || !node) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      reveal(false);
      return;
    }

    const rootMargin = 600;
    const rect = node.getBoundingClientRect();
    const withinMargin =
      rect.bottom >= -rootMargin &&
      rect.top <= window.innerHeight + rootMargin;

    if (withinMargin) {
      reveal(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        reveal(true);
        observer.disconnect();

        if (observerRef.current === observer) {
          observerRef.current = null;
        }
      },
      { rootMargin: `${rootMargin}px` },
    );

    observer.observe(node);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      if (observerRef.current === observer) {
        observerRef.current = null;
      }
    };
  }, [enabled, reveal, shouldRender]);

  React.useEffect(
    () => () => {
      observerRef.current?.disconnect();

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    },
    [],
  );

  return { ref, shouldRender, enter };
}

const StickerSection = React.memo(function StickerSection({
  active,
  group,
  stickers: groupStickers,
  missing,
  duplicates,
  sectionIndex,
  onEditDuplicates,
}: {
  active: boolean;
  group: StickerGroup;
  stickers: Sticker[];
  missing: number;
  duplicates: number;
  sectionIndex: number;
  onEditDuplicates: (sticker: Sticker) => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  const [open, setOpen] = React.useState(true);
  const { ref, shouldRender, enter } = useLazySection(active && open);
  const sectionAnimationDelay = Math.min(sectionIndex * 50, 200);
  const gridClassName =
    "grid grid-cols-4 gap-3 min-[430px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 py-3";

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 py-2 text-left"
      >
        <header>
          <h2 className="text-lg font-semibold tracking-normal">
            {getStickerGroupLabel(group, locale)}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {duplicates > 0
              ? t(locale, "album.group.summaryWithDuplicates", {
                  missing,
                  duplicates,
                })
              : t(locale, "album.group.summary", { missing })}
          </p>
        </header>
        <ChevronDown
          className={cn(
            "size-5 text-muted-foreground transition-transform duration-200",
            !open && "-rotate-90",
          )}
        />
      </button>
      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div
            ref={ref}
            className={cn(
              gridClassName,
              "lazy-sticker-grid-ready",
              enter && "lazy-sticker-grid-entered",
            )}
            style={
              {
                "--lazy-section-delay": `${sectionAnimationDelay}ms`,
                ...(shouldRender && {
                  contentVisibility: "auto",
                  containIntrinsicSize: "auto 720px",
                }),
              } as React.CSSProperties
            }
          >
            {shouldRender &&
              groupStickers.map((sticker) => (
                <StickerCard
                  key={sticker.id}
                  sticker={sticker}
                  onEditDuplicates={onEditDuplicates}
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
});

const SettingsDrawer = React.memo(function SettingsDrawer({
  open,
  onOpenChange,
  collectionName,
  collectionByStickerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  collectionByStickerId: Record<string, number>;
}) {
  const { setTheme } = useTheme();
  const [exportKind, setExportKind] = React.useState<ExportKind>("both");
  const settings = useStickerStore((state) => state.settings);
  const updateSetting = useStickerStore((state) => state.updateSetting);
  const resetCollection = useStickerStore((state) => state.resetCollection);
  const locale = useStickerStore((state) => state.settings.locale);
  const getExportText = React.useCallback(
    () =>
      buildTxtExportByKind(
        exportKind,
        collectionName,
        collectionByStickerId,
        locale,
      ),
    [collectionByStickerId, collectionName, exportKind, locale],
  );
  const exportMeta = getExportMeta(exportKind, locale);

  const updateTheme = (theme: ThemePreference) => {
    updateSetting("theme", theme);
    setTheme(theme);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="space-y-5 px-5 pb-5 pt-4">
          <div>
            <DrawerTitle className="text-lg font-semibold">
              {t(locale, "settings.title")}
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm text-muted-foreground">
              {t(locale, "settings.description")}
            </DrawerDescription>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t(locale, "settings.language.title")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {localeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateSetting("locale", option.id)}
                  className={cn(
                    "h-10 rounded-sm border text-sm font-medium transition-colors",
                    settings.locale === option.id &&
                      "border-primary/40 bg-primary/10 text-primary",
                  )}
                >
                  {t(locale, option.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["dark", "light", "system"] as const).map((theme) => {
              const themeLabelKey =
                theme === "dark"
                  ? "settings.theme.dark"
                  : theme === "light"
                    ? "settings.theme.light"
                    : "settings.theme.system";

              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => updateTheme(theme)}
                  className={cn(
                    "h-10 rounded-sm border text-sm font-medium transition-colors",
                    settings.theme === theme &&
                      "border-primary/40 bg-primary/10 text-primary",
                  )}
                >
                  {t(locale, themeLabelKey)}
                </button>
              );
            })}
          </div>
          <div className="space-y-4">
            <SettingRow
              title={t(locale, "settings.compactGrid.title")}
              description={t(locale, "settings.compactGrid.description")}
              checked={settings.compactMode}
              onChange={(checked) => updateSetting("compactMode", checked)}
            />
            <SettingRow
              title={t(locale, "settings.animations.title")}
              description={t(locale, "settings.animations.description")}
              checked={settings.animations}
              onChange={(checked) => updateSetting("animations", checked)}
            />
          </div>
          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="mb-2 text-sm font-medium">
                {t(locale, "settings.export.title")}
              </p>
              <ExportTypeSelector value={exportKind} onChange={setExportKind} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="pill"
                className="shadow-none"
                onClick={async () => {
                  const exportText = getExportText();
                  const copied = await copyText(exportText);
                  if (!copied) downloadText(exportMeta.fileName, exportText);
                }}
              >
                <Copy className="size-4" />
                {t(locale, "settings.export.copyTxt")}
              </Button>
              <Button
                size="pill"
                className="shadow-none"
                onClick={() =>
                  downloadText(exportMeta.fileName, getExportText())
                }
              >
                <Download className="size-4" />
                {t(locale, "settings.export.download")}
              </Button>
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">{t(locale, "settings.reset.title")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(locale, "settings.reset.description")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="pill"
                  className="w-full border-destructive/40 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
                >
                  <RotateCcw className="size-4" />
                  {t(locale, "settings.reset.button")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t(locale, "settings.reset.dialogTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(locale, "settings.reset.dialogDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button variant="secondary" className="shadow-none">
                      {t(locale, "settings.reset.dialogCancel")}
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      variant="destructive"
                      className="shadow-none"
                      onClick={resetCollection}
                    >
                      {t(locale, "settings.reset.dialogConfirm")}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
});

const ShareDrawer = React.memo(function ShareDrawer({
  open,
  onOpenChange,
  collectionName,
  collectionByStickerId,
  onShareStateChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  collectionByStickerId: Record<string, number>;
  onShareStateChange: (state: "idle" | "copied" | "downloaded") => void;
}) {
  const [exportKind, setExportKind] = React.useState<ExportKind>("missing");
  const locale = useStickerStore((state) => state.settings.locale);
  const getExportText = React.useCallback(
    () =>
      buildTxtExportByKind(
        exportKind,
        collectionName,
        collectionByStickerId,
        locale,
      ),
    [collectionByStickerId, collectionName, exportKind, locale],
  );
  const exportMeta = getExportMeta(exportKind, locale);

  const announceShareState = React.useCallback(
    (state: "copied" | "downloaded") => {
      onShareStateChange(state);
      window.setTimeout(() => onShareStateChange("idle"), 1400);
    },
    [onShareStateChange],
  );

  const shareExport = async () => {
    const exportText = getExportText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: exportMeta.shareTitle,
          text: exportText,
        });
        onOpenChange(false);
        return;
      } catch {
        // Fall back to local export actions.
      }
    }

    const copied = await copyText(exportText);
    if (copied) {
      announceShareState("copied");
    } else {
      downloadText(exportMeta.fileName, exportText);
      announceShareState("downloaded");
    }
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="space-y-5 px-5 pb-5 pt-4">
          <div>
            <DrawerTitle className="text-lg font-semibold">
              {t(locale, "share.title")}
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm text-muted-foreground">
              {t(locale, "share.description")}
            </DrawerDescription>
          </div>

          <ExportTypeSelector value={exportKind} onChange={setExportKind} />

          <div className="grid grid-cols-3 gap-2">
            <Button
              size="pill"
              className="h-auto min-h-11 flex-col gap-1 whitespace-normal rounded-sm px-2 py-2 text-xs shadow-none"
              onClick={shareExport}
            >
              <Share2 className="size-4" />
              {t(locale, "share.action.share")}
            </Button>
            <Button
              variant="secondary"
              size="pill"
              className="h-auto min-h-11 flex-col gap-1 whitespace-normal rounded-sm px-2 py-2 text-xs shadow-none"
              onClick={async () => {
                const exportText = getExportText();
                const copied = await copyText(exportText);
                if (copied) {
                  announceShareState("copied");
                } else {
                  downloadText(exportMeta.fileName, exportText);
                  announceShareState("downloaded");
                }
              }}
            >
              <Copy className="size-4" />
              {t(locale, "share.action.copyTxt")}
            </Button>
            <Button
              variant="secondary"
              size="pill"
              className="h-auto min-h-11 flex-col gap-1 whitespace-normal rounded-sm px-2 py-2 text-xs shadow-none"
              onClick={() => {
                downloadText(exportMeta.fileName, getExportText());
                announceShareState("downloaded");
              }}
            >
              <Download className="size-4" />
              {t(locale, "share.action.downloadTxt")}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
});

function ExportTypeSelector({
  value,
  onChange,
}: {
  value: ExportKind;
  onChange: (value: ExportKind) => void;
}) {
  const locale = useStickerStore((state) => state.settings.locale);

  return (
    <div className="grid grid-cols-3 gap-2">
      {stickerExportOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "min-h-11 rounded-sm border px-2 text-sm font-medium transition-colors",
            value === option.id
              ? "border-primary/45 bg-primary/10 text-primary"
              : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {t(locale, option.labelKey)}
        </button>
      ))}
    </div>
  );
}

function mapStatsToItems(
  locale: Locale,
  stats: ReturnType<typeof useCollectionStats>,
) {
  return [
    { label: t(locale, "collection.ratio"), value: `${stats.collected}/${stats.total}` },
    { label: t(locale, "collection.percent"), value: `${stats.completion}%` },
    { label: t(locale, "collection.total"), value: stats.total },

    { label: t(locale, "collection.collected"), value: stats.collected },
    { label: t(locale, "collection.missing"), value: stats.missing },
    { label: t(locale, "collection.duplicates"), value: stats.duplicateCopies },

    {
      label: t(locale, "collection.special"),
      value: `${stats.specialCollected}/${stats.specialTotal}`,
    },
    {
      label: t(locale, "stats.summary.teams"),
      value: `${stats.teamCollected}/${stats.teamTotal}`,
    },
    {
      label: t(locale, "stats.summary.shields"),
      value: `${stats.shieldCollected}/${stats.shieldTotal}`,
    },
  ];
}

const StatsDrawer = React.memo(function StatsDrawer({
  open,
  onOpenChange,
  collectionByStickerId,
  stats,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionByStickerId: Record<string, number>;
  stats: ReturnType<typeof useCollectionStats>;
}) {
  const [activeTab, setActiveTab] = React.useState<StatsTab>("summary");
  const [teamSort, setTeamSort] = React.useState<TeamSortMode>("most");
  const locale = useStickerStore((state) => state.settings.locale);
  const items = React.useMemo(
    () => (open ? mapStatsToItems(locale, stats) : []),
    [locale, open, stats],
  );

  const teamProgress = React.useMemo(
    () =>
      !open || activeTab !== "teams"
        ? []
        : buildTeamProgress(collectionByStickerId).sort((a, b) =>
            teamSort === "most" ? b.percent - a.percent : a.percent - b.percent,
          ),
    [activeTab, collectionByStickerId, open, teamSort],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="space-y-5 overflow-y-auto px-5 pb-5 pt-4">
          <div>
            <DrawerTitle className="text-lg font-semibold">
              {t(locale, "stats.title")}
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm text-muted-foreground">
              {t(locale, "stats.description")}
            </DrawerDescription>
          </div>

          <div className="grid grid-cols-[6rem_1fr] rounded-sm border text-sm">
            <div className="p-2 grid place-items-center  border-r">
              <ProgressRing value={stats.completion} size="default" />
            </div>
            <DataGrid items={items} cols={3} />
            {/* <div className="grid grid-cols-3 text-sm">
              <StatCell
                label="Ratio"
                value={`${stats.collected}/${stats.total}`}
              />
              <StatCell label="Percent" value={`${stats.completion}%`} />
              <StatCell label="Total" value={stats.total} />
              <StatCell label="Collected" value={stats.collected} />
              <StatCell label="Missing" value={stats.missing} />
              <StatCell label="Duplicates" value={stats.duplicateCopies} />
              <StatCell
                label="Special"
                value={`${stats.specialCollected}/${stats.specialTotal}`}
              />
              <StatCell
                label="Teams"
                value={`${stats.teamCollected}/${stats.teamTotal}`}
              />
              <StatCell
                label="Shields"
                value={`${stats.shieldCollected}/${stats.shieldTotal}`}
              />
            </div> */}
          </div>

          <div className="grid grid-cols-2 border-b">
            {(["summary", "teams"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative h-10 text-sm font-medium capitalize text-muted-foreground transition-colors",
                  activeTab === tab && "text-primary",
                )}
              >
                {t(locale, `stats.tabs.${tab}` as const)}
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-[-1px] h-0.5 bg-primary opacity-0",
                    activeTab === tab && "opacity-100",
                  )}
                />
              </button>
            ))}
          </div>

          {activeTab === "summary" ? (
            <div className="space-y-3">
              <ProgressRow
                label={t(locale, "stats.summary.albumCompletion")}
                value={stats.completion}
                detail={`${stats.collected}/${stats.total}`}
              />
              <ProgressRow
                label={t(locale, "stats.summary.specialCompletion")}
                value={percentage(stats.specialCollected, stats.specialTotal)}
                detail={`${stats.specialCollected}/${stats.specialTotal}`}
              />
              <ProgressRow
                label={t(locale, "stats.summary.teams")}
                value={percentage(stats.teamCollected, stats.teamTotal)}
                detail={`${stats.teamCollected}/${stats.teamTotal}`}
              />
              <ProgressRow
                label={t(locale, "stats.summary.shields")}
                value={percentage(stats.shieldCollected, stats.shieldTotal)}
                detail={`${stats.shieldCollected}/${stats.shieldTotal}`}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center rounded-sm shadow-none"
                onClick={() =>
                  setTeamSort((mode) => (mode === "most" ? "least" : "most"))
                }
              >
                {teamSort === "most"
                  ? t(locale, "stats.sort.most")
                  : t(locale, "stats.sort.least")}
              </Button>
              {teamProgress.map((item) => (
                <TeamProgressRow key={item.code} item={item} />
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
});

function ProgressRing({
  value,
  size = "default",
}: {
  value: number;
  size?: "default" | "large";
}) {
  const locale = useStickerStore((state) => state.settings.locale);
  const dimensions = size === "large" ? 112 : 72;
  const stroke = size === "large" ? 5 : 4;
  const radius = (dimensions - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className={cn(
        "relative grid place-items-center",
        size === "large" ? "size-28" : "size-[72px]",
      )}
    >
      <svg width={dimensions} height={dimensions} className="-rotate-90">
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-muted"
        />
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          className="text-primary transition-[stroke-dashoffset] duration-300 ease-out"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute text-center">
        <p
          className={cn(
            "font-semibold leading-none",
            size === "large" ? "text-4xl" : "text-xl",
          )}
        >
          {value}%
        </p>
        {size === "large" && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t(locale, "collection.complete")}
          </p>
        )}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {detail} · {value}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function TeamProgressRow({
  item,
}: {
  item: {
    code: string;
    flag: string;
    label: string;
    collected: number;
    total: number;
    percent: number;
  };
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">
          <span className="mr-2">{item.flag}</span>
          <span className="font-medium">{item.code}</span>
          <span className="ml-2 text-muted-foreground">{item.label}</span>
        </span>
        <span className="shrink-0 text-muted-foreground">
          {item.collected}/{item.total} · {item.percent}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${item.percent}%` }}
        />
      </div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function buildTeamProgress(collectionByStickerId: Record<string, number>) {
  return stickerGroups
    .filter((group) => group.category === "country")
    .map((group) => {
      const groupStickers = stickers.filter(
        (sticker) => sticker.groupId === group.id,
      );
      const collected = groupStickers.filter(
        (sticker) => getStickerCopies(collectionByStickerId, sticker.id) > 0,
      ).length;
      const total = groupStickers.length;

      return {
        code: group.countryCode ?? group.id.toUpperCase(),
        flag: group.flag ?? "",
        label: group.label,
        collected,
        total,
        percent: percentage(collected, total),
      };
    });
}

function percentage(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
