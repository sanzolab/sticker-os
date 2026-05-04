"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  Download,
  Minus,
  Plus,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getGroupedStickers,
  getStickerCopies,
  getVisualState,
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

type AlbumTab = "all" | "missing" | "duplicates" | "special";
type SortMode = "grouped" | "az";
type StatsTab = "summary" | "teams";
type TeamSortMode = "most" | "least";

const albumTabs: { id: AlbumTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "missing", label: "Missing" },
  { id: "duplicates", label: "Duplicates" },
  { id: "special", label: "Special" },
];

export function StickerOSApp() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<AlbumTab>("all");
  const [sortMode, setSortMode] = React.useState<SortMode>("grouped");
  const [shareState, setShareState] = React.useState<
    "idle" | "copied" | "downloaded"
  >("idle");
  const collectionName = useStickerStore((state) => state.selectedCollection);
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );
  const query = useStickerStore((state) => state.searchQuery);
  const setQuery = useStickerStore((state) => state.setSearchQuery);
  const stats = useCollectionStats();

  const visibleStickers = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return stickers.filter((sticker) => {
      const copies = getStickerCopies(collectionByStickerId, sticker.id);
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "missing" && copies === 0) ||
        (activeTab === "duplicates" && copies > 1) ||
        (activeTab === "special" && sticker.special);

      if (!matchesTab) return false;
      if (!normalized) return true;

      return [
        sticker.number,
        sticker.code,
        sticker.title,
        sticker.groupLabel,
        sticker.countryCode,
        sticker.exportLabel,
        sticker.kind,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized));
    });
  }, [activeTab, collectionByStickerId, query]);

  const grouped = React.useMemo(() => {
    const sections = getGroupedStickers(visibleStickers);

    if (sortMode === "grouped") return sections;

    return [...sections].sort((a, b) =>
      a.group.label.localeCompare(b.group.label),
    );
  }, [sortMode, visibleStickers]);

  const exportText = React.useMemo(
    () => buildMissingTxtExport(collectionName, collectionByStickerId),
    [collectionByStickerId, collectionName],
  );

  const shareMissing = async () => {
    const fileName = "stickeros-missing-list.txt";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "StickerOS missing list",
          text: exportText,
        });
        return;
      } catch {
        // Continue to clipboard fallback when sharing is cancelled or unsupported.
      }
    }

    try {
      await navigator.clipboard?.writeText(exportText);
      setShareState("copied");
    } catch {
      downloadText(fileName, exportText);
      setShareState("downloaded");
    }

    window.setTimeout(() => setShareState("idle"), 1400);
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <TopBar
        collectionName={collectionName}
        shareState={shareState}
        onShare={shareMissing}
        onSettings={() => setSettingsOpen(true)}
      />
      <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-[4.75rem] sm:px-6 lg:px-8">
        <section className="mb-8  border rounded-md divide-y">
          <CollectionHeader
            stats={stats}
            onViewMore={() => setStatsOpen(true)}
          />
        </section>

        <StickyControls
          activeTab={activeTab}
          query={query}
          sortMode={sortMode}
          onQueryChange={setQuery}
          onSortToggle={() =>
            setSortMode((mode) => (mode === "grouped" ? "az" : "grouped"))
          }
          onTabChange={setActiveTab}
        />

        <section className="space-y-4 pt-4">
          {grouped.map(({ group, stickers: groupStickers }) => (
            <StickerSection
              key={group.id}
              group={group}
              stickers={groupStickers}
              collectionByStickerId={collectionByStickerId}
            />
          ))}
          {grouped.length === 0 && (
            <Card className="shadow-none">
              <CardContent className="flex min-h-32 flex-col items-center justify-center p-5 text-center">
                <p className="text-sm font-medium">No stickers found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a code like ARG13 or a country name.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        exportText={exportText}
      />
      <StatsDrawer open={statsOpen} onOpenChange={setStatsOpen} />
    </main>
  );
}

function TopBar({
  collectionName,
  shareState,
  onShare,
  onSettings,
}: {
  collectionName: string;
  shareState: "idle" | "copied" | "downloaded";
  onShare: () => void;
  onSettings: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40  bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button className="inline-flex items-center gap-1 rounded-md px-0.5 py-2 text-xl font-semibold tracking-normal transition-transform active:scale-[0.99] sm:text-2xl">
          {collectionName}
          {/* <ChevronDown className="mt-0.5 size-5 text-muted-foreground" /> */}
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-md shadow-none"
            onClick={onShare}
            aria-label="Share missing list"
          >
            <Share2 className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-md shadow-none"
            onClick={onSettings}
            aria-label="Open settings"
          >
            <Settings className="size-5" />
          </Button>
        </div>
      </div>
      {shareState !== "idle" && (
        <div className="absolute right-14 top-12 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">
          {shareState === "copied" ? "Copied" : "Downloaded"}
        </div>
      )}
    </header>
  );
}

function CollectionHeader({
  stats,
  onViewMore,
}: {
  stats: ReturnType<typeof useCollectionStats>;
  onViewMore: () => void;
}) {
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
                Collection Progress
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
                View More
                <ChevronRight className="mt-0.5 size-5 " />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="w-ful grid grid-cols-4 divide-x text-center">
        <HeaderMetric
          icon={<CircleDot className="size-5 text-primary" />}
          label="Collected"
          value={stats.collected}
        />
        <HeaderMetric
          icon={<CircleDot className="size-5 text-foreground" />}
          label="Missing"
          value={stats.missing}
        />
        <HeaderMetric
          icon={<Trophy className="size-5 text-amber-500" />}
          label="Duplicates"
          value={stats.duplicateCopies}
        />
        <HeaderMetric
          icon={<Sparkles className="size-5 text-yellow-400" />}
          label="Special"
          value={`${stats.specialCollected}/${stats.specialTotal}`}
        />
      </div>
    </>
  );
}

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

function StickyControls({
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
  return (
    <section className="sticky top-14 z-30 -mx-4  bg-background px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="grid grid-cols-4">
        {albumTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative h-12 text-sm font-medium text-muted-foreground transition-colors",
              activeTab === tab.id && "text-primary",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "absolute inset-x-0 bottom-[-1px] h-0.5 bg-primary opacity-0 transition-opacity",
                activeTab === tab.id && "opacity-100",
              )}
            />
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_3.5rem] gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search ARG13, Mexico, shield..."
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
              ? "Sort alphabetically"
              : "Return to grouped order"
          }
          title={sortMode === "grouped" ? "Grouped order" : "A-Z order"}
        >
          <SlidersHorizontal className="size-5" />
        </Button>
      </div>
    </section>
  );
}

function StickerSection({
  group,
  stickers: groupStickers,
  collectionByStickerId,
}: {
  group: StickerGroup;
  stickers: Sticker[];
  collectionByStickerId: Record<string, number>;
}) {
  const [open, setOpen] = React.useState(true);
  const missing = groupStickers.filter(
    (sticker) => getStickerCopies(collectionByStickerId, sticker.id) === 0,
  ).length;
  const duplicates = groupStickers.reduce(
    (sum, sticker) =>
      sum +
      Math.max(getStickerCopies(collectionByStickerId, sticker.id) - 1, 0),
    0,
  );

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 py-2 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-normal">
            {group.label}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {missing} missing
            {duplicates > 0 ? ` · ${duplicates} duplicates` : ""}
          </p>
        </div>
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
          <div className="grid grid-cols-4 gap-3 py-3 min-[430px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {groupStickers.map((sticker) => (
              <StickerCard key={sticker.id} sticker={sticker} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StickerCard({ sticker }: { sticker: Sticker }) {
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );
  const tapSticker = useStickerStore((state) => state.tapSticker);
  const removeSticker = useStickerStore((state) => state.removeSticker);
  const animations = useStickerStore((state) => state.settings.animations);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const longPressed = React.useRef(false);
  const copies = getStickerCopies(collectionByStickerId, sticker.id);
  const state = getVisualState(collectionByStickerId, sticker);

  const beginPress = () => {
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (copies === 1) removeSticker(sticker.id);
      if (copies > 1) setEditorOpen(true);
    }, 450);
  };

  const endPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleClick = () => {
    if (longPressed.current) return;
    tapSticker(sticker.id);
  };

  return (
    <>
      <button
        type="button"
        onPointerDown={beginPress}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onPointerLeave={endPress}
        onClick={handleClick}
        className={cn(
          "relative flex aspect-[3/4.35] select-none items-center justify-center rounded-md border text-2xl font-medium tracking-normal",
          "transition-[background-color,border-color,color,transform] duration-150 ease-out",
          animations && "active:scale-[0.97]",
          state === "missing" &&
            "border-dashed border-border/70 bg-background text-muted-foreground/70",
          state === "owned" &&
            "border-primary/25 bg-primary/[0.08] text-foreground",
          state === "duplicate" &&
            "border-primary/30 bg-primary/10 text-foreground",
          state === "special" &&
            "border-primary/25 bg-primary/[0.08] text-foreground",
        )}
        aria-label={`${sticker.code}, ${copies} copies`}
      >
        {sticker.special && (
          <span className="absolute right-3 top-3 text-sm leading-none text-yellow-400">
            ✨
          </span>
        )}
        <span>{sticker.number}</span>
        {state === "missing" && (
          <span className="absolute bottom-5 size-2 rounded-full border border-muted-foreground/60" />
        )}
        {copies > 1 && (
          <span className="absolute bottom-4 right-3 rounded-full border bg-background px-1.5 py-0.5 text-xs font-semibold leading-none text-foreground">
            x{copies - 1}
          </span>
        )}
      </button>
      <DuplicateEditor
        sticker={sticker}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </>
  );
}

function DuplicateEditor({
  sticker,
  open,
  onOpenChange,
}: {
  sticker: Sticker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const copies = useStickerStore(
    (state) => state.collectionByStickerId[sticker.id] ?? 0,
  );
  const setStickerCopies = useStickerStore((state) => state.setStickerCopies);
  const [draft, setDraft] = React.useState<number | null>(null);
  const duplicateDraft = draft ?? Math.max(copies - 1, 0);

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setDraft(null);
        onOpenChange(nextOpen);
      }}
    >
      <DrawerContent>
        <div className="px-5 pb-5 pt-4 text-center">
          <Badge variant="secondary" className="mb-3 rounded-md">
            {sticker.code}
          </Badge>
          <DrawerTitle className="text-lg font-semibold">
            Edit duplicates
          </DrawerTitle>
          <DrawerDescription className="mt-1 text-sm text-muted-foreground">
            Set extra copies for {sticker.groupLabel}.
          </DrawerDescription>
          <div className="mx-auto my-6 flex items-center justify-center gap-4">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full shadow-none"
              onClick={() =>
                setDraft((value) => Math.max((value ?? duplicateDraft) - 1, 0))
              }
              aria-label="Decrease duplicates"
            >
              <Minus className="size-4" />
            </Button>
            <div className="min-w-14 text-3xl font-semibold">
              {duplicateDraft}
            </div>
            <Button
              size="icon"
              className="rounded-full shadow-none"
              onClick={() => setDraft((value) => (value ?? duplicateDraft) + 1)}
              aria-label="Increase duplicates"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <DrawerClose asChild>
            <Button
              size="pill"
              className="w-full"
              onClick={() => setStickerCopies(sticker.id, duplicateDraft + 1)}
            >
              Confirm
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SettingsDrawer({
  open,
  onOpenChange,
  exportText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportText: string;
}) {
  const { setTheme } = useTheme();
  const settings = useStickerStore((state) => state.settings);
  const updateSetting = useStickerStore((state) => state.updateSetting);

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
              Settings
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm text-muted-foreground">
              Stored locally with automatic persistence.
            </DrawerDescription>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["dark", "light", "system"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => updateTheme(theme)}
                className={cn(
                  "h-10 rounded-md border text-sm font-medium capitalize transition-colors",
                  settings.theme === theme &&
                    "border-primary/40 bg-primary/10 text-primary",
                )}
              >
                {theme}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <SettingRow
              title="Compact grid"
              description="Tighter sticker spacing."
              checked={settings.compactMode}
              onChange={(checked) => updateSetting("compactMode", checked)}
            />
            <SettingRow
              title="Animations"
              description="Subtle press feedback."
              checked={settings.animations}
              onChange={(checked) => updateSetting("animations", checked)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t pt-4">
            <Button
              variant="secondary"
              size="pill"
              className="shadow-none"
              onClick={() => copyText(exportText)}
            >
              Copy TXT
            </Button>
            <Button
              size="pill"
              className="shadow-none"
              onClick={() =>
                downloadText("stickeros-missing-list.txt", exportText)
              }
            >
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function StatsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<StatsTab>("summary");
  const [teamSort, setTeamSort] = React.useState<TeamSortMode>("most");
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );
  const stats = useCollectionStats();
  const teamProgress = React.useMemo(
    () =>
      buildTeamProgress(collectionByStickerId).sort((a, b) =>
        teamSort === "most" ? b.percent - a.percent : a.percent - b.percent,
      ),
    [collectionByStickerId, teamSort],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="space-y-5 overflow-y-auto px-5 pb-5 pt-4">
          <div>
            <DrawerTitle className="text-lg font-semibold">
              Collection Summary
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm text-muted-foreground">
              Progress is calculated from the current album data.
            </DrawerDescription>
          </div>

          <div className="grid grid-cols-[5rem_1fr] gap-4 rounded-md border p-3">
            <ProgressRing value={stats.completion} />
            <div className="grid grid-cols-3 gap-2 text-sm">
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
            </div>
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
                {tab}
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
                label="Album completion"
                value={stats.completion}
                detail={`${stats.collected}/${stats.total}`}
              />
              <ProgressRow
                label="Special completion"
                value={percentage(stats.specialCollected, stats.specialTotal)}
                detail={`${stats.specialCollected}/${stats.specialTotal}`}
              />
              <ProgressRow
                label="Teams"
                value={percentage(stats.teamCollected, stats.teamTotal)}
                detail={`${stats.teamCollected}/${stats.teamTotal}`}
              />
              <ProgressRow
                label="Shields"
                value={percentage(stats.shieldCollected, stats.shieldTotal)}
                detail={`${stats.shieldCollected}/${stats.shieldTotal}`}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center rounded-md shadow-none"
                onClick={() =>
                  setTeamSort((mode) => (mode === "most" ? "least" : "most"))
                }
              >
                {teamSort === "most"
                  ? "Most complete first"
                  : "Least complete first"}
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
}

function ProgressRing({
  value,
  size = "default",
}: {
  value: number;
  size?: "default" | "large";
}) {
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
          <p className="mt-2 text-sm text-muted-foreground">Complete</p>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
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

function buildMissingTxtExport(
  collectionName: string,
  collectionByStickerId: Record<string, number>,
) {
  const sections = stickerGroups
    .map((group) => {
      const missing = stickers
        .filter(
          (sticker) =>
            sticker.groupId === group.id &&
            getStickerCopies(collectionByStickerId, sticker.id) === 0,
        )
        .map((sticker) => sticker.number);

      if (missing.length === 0) return null;
      return `${group.exportLabel}: ${missing.join(", ")}`;
    })
    .filter(Boolean);

  return [
    "Figuritas App - Lista",
    collectionName,
    "Me faltan",
    "",
    ...sections,
  ].join("\n");
}

async function copyText(text: string) {
  await navigator.clipboard?.writeText(text);
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
