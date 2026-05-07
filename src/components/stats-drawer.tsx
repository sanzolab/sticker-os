"use client";

import { useMemo, useState } from "react";
import { AnimatedTabPanel } from "@/components/ui/animated-tab-panel";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { DataGrid } from "@/components/data-grid";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { t, type Locale } from "@/lib/i18n";
import { useCollectionStats, useStickerStore } from "@/lib/store";
import { getStickerCopies, stickerGroups, stickers } from "@/lib/sticker-data";
import { ProgressRing } from "./progress-ring";
import { ProgressRow } from "./progress-row";
import { TeamProgressRow } from "./team-progress-row";

type StatsTab = "summary" | "teams";
type TeamSortMode = "most" | "least";

export function StatsDrawer({
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
  const [activeTab, setActiveTab] = useState<StatsTab>("summary");
  const [teamSort, setTeamSort] = useState<TeamSortMode>("most");
  const locale = useStickerStore((state) => state.settings.locale);
  const items = useMemo(
    () => (open ? mapStatsToItems(locale, stats) : []),
    [locale, open, stats],
  );

  const teamProgress = useMemo(
    () =>
      !open || activeTab !== "teams"
        ? []
        : buildTeamProgress(collectionByStickerId).sort((a, b) =>
            teamSort === "most" ? b.percent - a.percent : a.percent - b.percent,
          ),
    [activeTab, collectionByStickerId, open, teamSort],
  );

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      bodyClassName="space-y-5 overflow-y-auto px-5 pb-5 pt-4"
    >
      <div>
        <DrawerTitle className="text-lg font-semibold">
          {t(locale, "stats.title")}
        </DrawerTitle>
        <DrawerDescription className="mt-1 text-sm text-muted-foreground">
          {t(locale, "stats.description")}
        </DrawerDescription>
      </div>

      <div className="grid grid-cols-[6rem_1fr] rounded-sm border text-sm">
        <div className="grid place-items-center border-r p-2">
          <ProgressRing value={stats.completion} size="default" />
        </div>
        <DataGrid items={items} cols={3} />
      </div>

      <AnimatedTabs
        tabs={[
          { id: "summary", label: t(locale, "stats.tabs.summary") },
          { id: "teams", label: t(locale, "stats.tabs.teams") },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="grid-cols-2"
        tabClassName="relative h-10 capitalize text-muted-foreground"
        activeTabClassName="text-primary"
      />

      <AnimatedTabPanel
        active={activeTab === "summary"}
        className="space-y-3"
      >
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
      </AnimatedTabPanel>

      <AnimatedTabPanel active={activeTab === "teams"} className="space-y-3">
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
      </AnimatedTabPanel>
    </AppDrawer>
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
