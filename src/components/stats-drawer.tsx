"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  CircleDashed,
  CircleDot,
  Repeat2,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { AnimatedTabPanel } from "@/components/ui/animated-tab-panel";
import { AnimatedTabs, type AnimatedTabItem } from "@/components/ui/animated-tabs";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { TabSlider } from "@/components/ui/tab-slider";
import { t } from "@/lib/i18n";
import { useCollectionStats, useStickerStore } from "@/lib/store";
import {
  getLocalizedCountryDisplayName,
  getStickerCopies,
  stickerGroups,
  stickers,
} from "@/lib/sticker-data";
import { ProgressRing } from "./progress-ring";
import { ProgressRow } from "./progress-row";
import { TeamProgressRow } from "./team-progress-row";

type StatsTab = "summary" | "teams";
type TeamSortMode = "most" | "least";
const statsTabs = ["summary", "teams"] as const satisfies readonly StatsTab[];

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
  const tabs = useMemo(
    () => [
      { id: "summary", label: t(locale, "stats.tabs.summary") },
      { id: "teams", label: t(locale, "stats.tabs.teams") },
    ] satisfies readonly AnimatedTabItem<StatsTab>[],
    [locale],
  );

  const handleTabChange = useCallback(
    (nextTab: StatsTab) => {
      if (nextTab === activeTab) return;
      setActiveTab(nextTab);
    },
    [activeTab],
  );

  const activeTabIndex = statsTabs.indexOf(activeTab);

  const handleSwipeChange = useCallback(
    (index: number) => {
      const nextTab = statsTabs[index];
      if (nextTab !== activeTab) setActiveTab(nextTab);
    },
    [activeTab],
  );

  const teamProgress = useMemo(
    () =>
      !open || activeTab !== "teams"
        ? []
        : buildTeamProgress(collectionByStickerId, locale).sort((a, b) =>
            teamSort === "most" ? b.percent - a.percent : a.percent - b.percent,
          ),
    [activeTab, collectionByStickerId, locale, open, teamSort],
  );

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      bodyClassName="space-y-5"
    >
      <div>
        <DrawerTitle className="text-lg font-semibold">
          {t(locale, "stats.title")}
        </DrawerTitle>
        <DrawerDescription className="mt-1 text-sm text-muted-foreground">
          {t(locale, "stats.description")}
        </DrawerDescription>
      </div>

      <div className="overflow-hidden rounded-sm border bg-card text-sm">
        <div className="grid grid-cols-[6rem_1fr] divide-x">
          <div className="grid place-items-center p-3">
            <ProgressRing value={stats.completion} size="default" />
          </div>
          <div className="min-w-0 p-3 sm:p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t(locale, "stats.overview.title")}
            </p>
            <p className="mt-2 text-2xl font-semibold leading-none sm:text-3xl">
              {stats.collected}/{stats.total}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t(locale, "stats.overview.remaining", { count: stats.missing })}
            </p>
          </div>
        </div>

        <div className="border-t">
          <div className="px-3 pt-3 sm:px-4">
            <DrawerSectionTitle title={t(locale, "stats.group.quickStats")} />
          </div>
          <div className="mt-2 grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <DrawerMetricCell
              icon={
                <CircleDashed
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              }
              label={t(locale, "collection.missing")}
              value={stats.missing}
              helper={t(locale, "stats.metric.missingHelp")}
            />
            <DrawerMetricCell
              icon={<Repeat2 className="size-4 text-primary" aria-hidden="true" />}
              label={t(locale, "collection.duplicates")}
              value={stats.duplicateCopies}
              helper={t(locale, "stats.metric.duplicatesHelp")}
              accent="primary"
            />
            <DrawerMetricCell
              icon={<Sparkles className="size-4 text-yellow-400" aria-hidden="true" />}
              label={t(locale, "collection.special")}
              value={`${stats.specialCollected}/${stats.specialTotal}`}
              helper={t(locale, "stats.metric.specialHelp")}
              accent="special"
            />
          </div>
        </div>
      </div>

      <AnimatedTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        className="grid-cols-2"
        tabClassName="relative h-10 capitalize text-muted-foreground"
        activeTabClassName="text-primary"
      />

      <TabSlider
        activeIndex={activeTabIndex}
        tabCount={2}
        onTabChange={handleSwipeChange}
      >
        <AnimatedTabPanel
          index={0}
          tabCount={2}
          active={activeTab === "summary"}
          className="space-y-3"
        >
          <DrawerSectionTitle
            title={t(locale, "stats.group.breakdown")}
            description={t(locale, "stats.group.breakdownHelp")}
          />
          <ProgressRow
            icon={<CircleDot className="size-4 text-primary" />}
            label={t(locale, "stats.summary.albumCompletion")}
            value={stats.completion}
            detail={`${stats.collected}/${stats.total}`}
          />
          <ProgressRow
            icon={<Sparkles className="size-4 text-yellow-400" />}
            label={t(locale, "stats.summary.specialCompletion")}
            value={percentage(stats.specialCollected, stats.specialTotal)}
            detail={`${stats.specialCollected}/${stats.specialTotal}`}
          />
          <ProgressRow
            icon={<Users className="size-4 text-muted-foreground" />}
            label={t(locale, "stats.summary.teams")}
            value={percentage(stats.teamCollected, stats.teamTotal)}
            detail={`${stats.teamCollected}/${stats.teamTotal}`}
          />
          <ProgressRow
            icon={<Shield className="size-4 text-muted-foreground" />}
            label={t(locale, "stats.summary.shields")}
            value={percentage(stats.shieldCollected, stats.shieldTotal)}
            detail={`${stats.shieldCollected}/${stats.shieldTotal}`}
          />
        </AnimatedTabPanel>

        <AnimatedTabPanel
          index={1}
          tabCount={2}
          active={activeTab === "teams"}
          className="space-y-3"
        >
          <DrawerSectionTitle
            title={t(locale, "stats.tabs.teams")}
            description={t(locale, "stats.group.teamHelp")}
          />
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
      </TabSlider>
    </AppDrawer>
  );
}

function DrawerSectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function DrawerMetricCell({
  icon,
  label,
  value,
  helper,
  accent = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  helper: string;
  accent?: "neutral" | "primary" | "special";
}) {
  const accentClassName =
    accent === "primary"
      ? "border-primary/25 bg-primary/10"
      : accent === "special"
        ? "border-yellow-500/25 bg-yellow-500/10"
        : "border-border bg-muted/50";

  return (
    <div className="min-w-0 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-sm border ${accentClassName}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function buildTeamProgress(
  collectionByStickerId: Record<string, number>,
  locale: "en" | "es",
) {
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
        name: getLocalizedCountryDisplayName(
          group.countryCode ?? group.id.toUpperCase(),
          locale,
        ),
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
