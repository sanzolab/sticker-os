"use client";

import { useCallback, useRef, useState } from "react";
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
import { resolveTabScrollTarget } from "@/components/tab-scroll-restoration";
import { useIsomorphicLayoutEffect } from "@/components/use-isomorphic-layout-effect";
import { useElementHeight } from "@/hooks/use-element-height";
import { useAssistantStore } from "@/lib/assistant-store";
import { usePageScrollVisibility, useRegisterStickyActivation } from "@/lib/scroll-visibility";
import { useCollectionStats, useStickerStore } from "@/lib/store";
import { useAddStickersPendingStore } from "@/components/features/add-stickers/add-stickers-session";
import type { Sticker } from "@/lib/sticker-data";

type SortMode = "grouped" | "az";
const STICKY_TOP_PX = 56;
const STICKY_SAFETY_BUFFER_PX = 8;

export function StickerOSApp() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("grouped");
  const [activeTab, setActiveTab] = useState<AlbumTab>("all");
  const [duplicateEditorSticker, setDuplicateEditorSticker] =
    useState<Sticker | null>(null);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const stickyActivationSentinelRef = useRef<HTMLDivElement | null>(null);
  const stickyControlsRef = useRef<HTMLElement | null>(null);
  const topBarRef = useRef<HTMLElement | null>(null);
  const tabContentSectionRef = useRef<HTMLElement | null>(null);
  const tabScrollYByTabRef = useRef<Partial<Record<AlbumTab, number>>>({});
  const pendingTabRestoreRef = useRef<AlbumTab | null>(null);
  const stickyHeight = useElementHeight({ ref: stickyControlsRef });
  const topBarHeight = useElementHeight({ ref: topBarRef });

  const collectionName = useStickerStore((state) => state.selectedCollection);
  const collectionByStickerId = useStickerStore(
    (state) => state.collectionByStickerId,
  );
  const query = useStickerStore((state) => state.searchQuery);
  const setQuery = useStickerStore((state) => state.setSearchQuery);
  const locale = useStickerStore((state) => state.settings.locale);
  const stats = useCollectionStats();
  const { isStickyActive, tabsProgress, headerProgress } = usePageScrollVisibility();
  const pendingAddStickersCount = useAddStickersPendingStore(
    (state) => state.candidates.length,
  );
  const addStickersOpen = useAssistantStore((s) => s.addStickersOpen);
  const setAddStickersOpen = useAssistantStore((s) => s.setAddStickersOpen);

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
  }, [setAddStickersOpen]);

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

  const switchTab = useCallback((tab: AlbumTab) => {
    if (tab === activeTab) return;
    if (typeof window !== "undefined") {
      tabScrollYByTabRef.current[activeTab] = window.scrollY;
    }
    pendingTabRestoreRef.current = tab;
    setActiveTab(tab);
  }, [activeTab]);

  const activeTabIndex = albumTabs.findIndex((item) => item.id === activeTab);
  const safeTabsHeight = Math.max(stickyHeight || 0, 1);
  const safeTopBarHeight = Math.max(topBarHeight || 0, 1);
  const tabsHiddenOffsetPx =
    safeTabsHeight + Math.max(STICKY_TOP_PX, safeTopBarHeight) + STICKY_SAFETY_BUFFER_PX;
  const tabsStageDistancePx = tabsHiddenOffsetPx;

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (pendingTabRestoreRef.current !== activeTab) return;

    let rafId = window.requestAnimationFrame(() => {
      rafId = 0;

      const section = tabContentSectionRef.current;
      if (!section) {
        pendingTabRestoreRef.current = null;
        return;
      }

      const maxY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const fallbackY = Math.min(
        Math.max(
          section.getBoundingClientRect().top +
            window.scrollY -
            tabsHiddenOffsetPx,
          0,
        ),
        maxY,
      );

      const activePanel = section.querySelector<HTMLElement>(
        '[data-tab-panel-active="true"]',
      );
      const activeContentBottomY = activePanel
        ? activePanel.getBoundingClientRect().bottom + window.scrollY
        : fallbackY + window.innerHeight;
      const savedY = tabScrollYByTabRef.current[activeTab];
      const { targetY } = resolveTabScrollTarget({
        savedY,
        maxY,
        viewportHeight: window.innerHeight,
        activeContentBottomY,
        fallbackY,
      });

      if (Math.abs(window.scrollY - targetY) > 1) {
        window.scrollTo({ top: targetY, behavior: "auto" });
      }

      pendingTabRestoreRef.current = null;
    });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [activeTab, tabsHiddenOffsetPx]);

  useRegisterStickyActivation({
    sentinelRef: stickyActivationSentinelRef,
    stickyTopPx: STICKY_TOP_PX,
    tabsHeight: stickyHeight,
    topBarHeight,
    safetyBufferPx: STICKY_SAFETY_BUFFER_PX,
    naturalBufferPx: 24,
    tabsStageDistancePx,
  });

  const handleTabChange = useCallback((tab: AlbumTab) => {
    switchTab(tab);
  }, [switchTab]);

  const handleTabChangeByIndex = useCallback((index: number) => {
    const tab = albumTabs[index]?.id;
    if (!tab) return;
    switchTab(tab);
  }, [switchTab]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div data-scroll-chrome="shared">
        <TopBar
          rootRef={topBarRef}
          collectionName={collectionName}
          shareState={shareState}
          pendingAddStickersCount={pendingAddStickersCount}
          hiddenProgress={headerProgress}
          isStickyActive={isStickyActive}
          onShare={handleShareOpen}
          onAddStickers={handleAddStickersOpen}
          onTrade={handleTradeOpen}
          onSettings={handleSettingsOpen}
        />
      </div>
      <div className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6 lg:px-8" style={{ paddingTop: "calc(var(--top-bar-height) + 1.25rem)" }}>
        <section className="mb-8 divide-y rounded-sm border">
          <CollectionHeader stats={stats} onViewMore={handleStatsOpen} />
        </section>

        <div data-scroll-chrome="shared">
          <StickyControls
            rootRef={stickyControlsRef}
            activationSentinel={
              <div
                ref={stickyActivationSentinelRef}
                className="pointer-events-none h-0"
                aria-hidden
              />
            }
            activeTab={activeTab}
            query={query}
            sortMode={sortMode}
            hiddenProgress={tabsProgress}
            hiddenOffsetPx={tabsHiddenOffsetPx}
            isStickyActive={isStickyActive}
            onQueryChange={setQuery}
            onSortToggle={handleSortToggle}
            onTabChange={handleTabChange}
          />
        </div>

        <section
          ref={tabContentSectionRef}
          className="min-h-[calc(100dvh-8rem)] bg-background pt-4"
        >
          <AlbumTabPanel
            activeTabIndex={activeTabIndex}
            onTabChange={handleTabChangeByIndex}
            collectionByStickerId={collectionByStickerId}
            locale={locale}
            query={query}
            sortMode={sortMode}
            onEditDuplicates={handleEditDuplicates}
          />
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
