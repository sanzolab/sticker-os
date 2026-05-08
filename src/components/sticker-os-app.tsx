"use client";

import { useCallback, useState } from "react";
import { CollectionHeader } from "@/components/collection-header";
import { DuplicateEditor } from "@/components/duplicate-editor";
import { AlbumTabPanel } from "@/components/album-tab-panel";
import { AddStickersDrawer } from "@/components/features/add-stickers/add-stickers-drawer";
import { ShareDrawer } from "@/components/share-drawer";
import { SettingsDrawer } from "@/components/settings-drawer";
import { StatsDrawer } from "@/components/stats-drawer";
import { StickyControls, albumTabs, type AlbumTab } from "@/components/sticky-controls";
import { TopBar, type ShareState } from "@/components/top-bar";
import { TradeDrawer } from "@/components/trade-drawer";
import { useCollectionStats, useStickerStore } from "@/lib/store";
import { useAddStickersPendingStore } from "@/components/features/add-stickers/add-stickers-session";
import type { Sticker } from "@/lib/sticker-data";

type SortMode = "grouped" | "az";
type TabTransitionDirection = "left" | "right";

export function StickerOSApp() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addStickersOpen, setAddStickersOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<AlbumTab[]>(["all"]);
  const [sortMode, setSortMode] = useState<SortMode>("grouped");
  const [activeTab, setActiveTab] = useState<AlbumTab>("all");
  const [tabTransitionDirection, setTabTransitionDirection] =
    useState<TabTransitionDirection>("right");
  const [hasChangedTab, setHasChangedTab] = useState(false);
  const [duplicateEditorSticker, setDuplicateEditorSticker] =
    useState<Sticker | null>(null);
  const [shareState, setShareState] = useState<ShareState>("idle");

  const collectionName = useStickerStore((state) => state.selectedCollection);
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );
  const query = useStickerStore((state) => state.searchQuery);
  const setQuery = useStickerStore((state) => state.setSearchQuery);
  const locale = useStickerStore((state) => state.settings.locale);
  const stats = useCollectionStats();
  const pendingAddStickersCount = useAddStickersPendingStore(
    (state) => state.candidates.length,
  );

  const handleEditDuplicates = useCallback((sticker: Sticker) => {
    setDuplicateEditorSticker(sticker);
  }, []);

  const handleDuplicateEditorOpenChange = useCallback((open: boolean) => {
    if (!open) setDuplicateEditorSticker(null);
  }, []);

  const handleShareOpen = useCallback(() => {
    setShareOpen(true);
  }, []);

  const handleAddStickersOpen = useCallback(() => {
    setAddStickersOpen(true);
  }, []);

  const handleTradeOpen = useCallback(() => {
    setTradeOpen(true);
  }, []);

  const handleSettingsOpen = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleStatsOpen = useCallback(() => {
    setStatsOpen(true);
  }, []);

  const handleSortToggle = useCallback(() => {
    setSortMode((mode) => (mode === "grouped" ? "az" : "grouped"));
  }, []);

  const handleTabChange = useCallback(
    (tab: AlbumTab) => {
      if (tab === activeTab) return;

      const currentIndex = albumTabs.findIndex((item) => item.id === activeTab);
      const nextIndex = albumTabs.findIndex((item) => item.id === tab);

      setTabTransitionDirection(
        nextIndex > currentIndex ? "right" : "left",
      );
      setVisitedTabs((tabs) => (tabs.includes(tab) ? tabs : [...tabs, tab]));
      setActiveTab(tab);
      setHasChangedTab(true);
    },
    [activeTab],
  );

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <TopBar
        collectionName={collectionName}
        shareState={shareState}
        pendingAddStickersCount={pendingAddStickersCount}
        onShare={handleShareOpen}
        onAddStickers={handleAddStickersOpen}
        onTrade={handleTradeOpen}
        onSettings={handleSettingsOpen}
      />
      <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-[4.75rem] sm:px-6 lg:px-8">
        <section className="mb-8 divide-y rounded-sm border">
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
      <AddStickersDrawer
        open={addStickersOpen}
        onOpenChange={setAddStickersOpen}
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
