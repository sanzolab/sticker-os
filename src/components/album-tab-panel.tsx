"use client";

import { useMemo } from "react";
import { AnimatedTabPanel } from "@/components/ui/animated-tab-panel";
import { TabSlider } from "@/components/ui/tab-slider";
import { EmptyState } from "@/components/ui/empty-state";
import { t, type Locale } from "@/lib/i18n";
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
import { StickerSection } from "./sticker-section";
import { albumTabs, type AlbumTab } from "./sticky-controls";

type StickerSectionViewModel = {
  group: StickerGroup;
  stickers: Sticker[];
  missing: number;
  duplicates: number;
};

export function AlbumTabPanel({
  activeTabIndex,
  onTabChange,
  collectionByStickerId,
  locale,
  query,
  sortMode,
  onEditDuplicates,
}: {
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  collectionByStickerId: Record<string, number>;
  locale: Locale;
  query: string;
  sortMode: "grouped" | "az";
  onEditDuplicates: (sticker: Sticker) => void;
}) {
  return (
    <TabSlider
      activeIndex={activeTabIndex}
      tabCount={4}
      onTabChange={onTabChange}
    >
      {albumTabs.map(({ id: tab }, i) => (
        <AlbumTabContent
          key={tab}
          tab={tab}
          index={i}
          active={activeTabIndex === i}
          collectionByStickerId={collectionByStickerId}
          locale={locale}
          query={query}
          sortMode={sortMode}
          onEditDuplicates={onEditDuplicates}
        />
      ))}
    </TabSlider>
  );
}

function AlbumTabContent({
  tab,
  index,
  active,
  collectionByStickerId,
  locale,
  query,
  sortMode,
  onEditDuplicates,
}: {
  tab: AlbumTab;
  index: number;
  active: boolean;
  collectionByStickerId: Record<string, number>;
  locale: Locale;
  query: string;
  sortMode: "grouped" | "az";
  onEditDuplicates: (sticker: Sticker) => void;
}) {
  const sections = useMemo(
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
    <AnimatedTabPanel
      index={index}
      tabCount={4}
      active={active}
      className="space-y-4 bg-background"
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
        <EmptyState
          title={t(locale, "album.empty.title")}
          description={t(locale, "album.empty.description")}
          className="shadow-none"
        />
      )}
    </AnimatedTabPanel>
  );
}

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
  sortMode: "grouped" | "az";
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
