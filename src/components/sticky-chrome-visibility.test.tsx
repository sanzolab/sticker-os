/**
 * @vitest-environment jsdom
 */

import { render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GlobalSpeedDial } from "./global-speed-dial";
import { StickyControls } from "./sticky-controls";
import { TopBar } from "./top-bar";

const launchMock = vi.fn();
const setAddStickersOpenMock = vi.fn();

vi.mock("@/lib/i18n", () => ({
  t: (_locale: string, key: string) => key,
}));

vi.mock("@/lib/store", () => ({
  useStickerStore: (selector: (state: { settings: { locale: string } }) => unknown) =>
    selector({ settings: { locale: "en" } }),
}));

vi.mock("@/lib/assistant-store", () => ({
  useAssistantStore: (
    selector: (state: {
      launch: typeof launchMock;
      setAddStickersOpen: typeof setAddStickersOpenMock;
    }) => unknown,
  ) =>
    selector({
      launch: launchMock,
      setAddStickersOpen: setAddStickersOpenMock,
    }),
}));

vi.mock("@/components/ui/animated-tabs", () => ({
  AnimatedTabs: () => <div data-testid="animated-tabs" />,
}));

vi.mock("@/hooks/use-element-height", () => ({
  useElementHeight: () => 80,
}));

describe("sticky chrome visibility styles", () => {
  it("keeps the top bar fully visible when sticky phase is inactive", () => {
    const { container } = render(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        hiddenProgress={1}
        isStickyActive={false}
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header?.style.transform).toBe("none");
    expect(header?.style.opacity).toBe("1");
    expect(header?.style.transition).toBe("none");
    expect(header?.style.willChange).toBe("");
  });

  it("keeps top bar visible in sticky mode before hide threshold", () => {
    const { container } = render(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        hiddenProgress={0}
        isStickyActive
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header?.style.transform).toBe("translate3d(0, 0, 0)");
    expect(header?.style.opacity).toBe("1");
    expect(header?.style.transitionProperty).toBe("transform");
    expect(header?.style.transitionDuration).toBe("280ms");
    expect(header?.style.transitionTimingFunction).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    expect(header?.style.transitionDelay).toBe("0ms");
    expect(header?.style.willChange).toBe("transform");
  });

  it("does not show a trade badge when there is no pending exchange", () => {
    const { container } = render(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        tradeBadgeValue={null}
        hiddenProgress={0}
        isStickyActive={false}
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const tradeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="topbar.tradeAria"]',
    );
    expect(tradeButton?.querySelector(".bg-primary")).toBeNull();
  });

  it("shows an exclamation badge when trade is pending without selections", () => {
    const { container } = render(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        tradeBadgeValue="!"
        hiddenProgress={0}
        isStickyActive={false}
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const tradeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="topbar.tradeAria"]',
    );
    expect(tradeButton).not.toBeNull();
    if (!tradeButton) return;

    expect(within(tradeButton).getByText("!")).toBeTruthy();
    expect(
      within(tradeButton).getByLabelText("topbar.tradeBadge.pendingNeedsSelection"),
    ).toBeTruthy();
  });

  it("shows the selected-card total in the trade badge", () => {
    const { container } = render(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        tradeBadgeValue="7"
        hiddenProgress={0}
        isStickyActive={false}
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const tradeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="topbar.tradeAria"]',
    );
    expect(tradeButton).not.toBeNull();
    if (!tradeButton) return;

    expect(within(tradeButton).getByText("7")).toBeTruthy();
    expect(
      within(tradeButton).getByLabelText("topbar.tradeBadge.pendingCount"),
    ).toBeTruthy();
  });

  it("caps large trade badge values at 99+", () => {
    const { container } = render(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        tradeBadgeValue="120"
        hiddenProgress={0}
        isStickyActive={false}
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const tradeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="topbar.tradeAria"]',
    );
    expect(tradeButton).not.toBeNull();
    if (!tradeButton) return;

    expect(within(tradeButton).getByText("99+")).toBeTruthy();
  });

  it("snaps top bar hidden once the hide threshold is crossed", () => {
    const { container } = render(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        hiddenProgress={0.6}
        isStickyActive
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header?.style.transform).toBe("translate3d(0, -100%, 0)");
    expect(header?.style.opacity).toBe("1");
    expect(header?.style.transitionProperty).toBe("transform");
    expect(header?.style.transitionDuration).toBe("280ms");
    expect(header?.style.transitionTimingFunction).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    expect(header?.style.transitionDelay).toBe("80ms");
  });

  it("keeps top bar hidden inside hysteresis band until show threshold is crossed", () => {
    const { container, rerender } = render(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        hiddenProgress={0.6}
        isStickyActive
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header?.style.transform).toBe("translate3d(0, -100%, 0)");

    rerender(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        hiddenProgress={0.5}
        isStickyActive
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    expect(header?.style.transform).toBe("translate3d(0, -100%, 0)");

    rerender(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        hiddenProgress={0.4}
        isStickyActive
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    expect(header?.style.transform).toBe("translate3d(0, 0, 0)");
    expect(header?.style.transitionDelay).toBe("0ms");
  });

  it("renders sticky controls as a layout slot, sticky shell, and transform layer", () => {
    const { container } = render(
      <StickyControls
        activeTab="all"
        query=""
        sortMode="grouped"
        hiddenProgress={0}
        isStickyActive={false}
        onQueryChange={vi.fn()}
        onSortToggle={vi.fn()}
        onTabChange={vi.fn()}
      />,
    );

    const layoutSlot = container.querySelector<HTMLElement>(".sticky-controls-layout-slot");
    const stickyShell = container.querySelector<HTMLElement>(".sticky-controls-sticky-shell");
    const transformLayer = container.querySelector<HTMLElement>(".sticky-controls-transform-layer");

    expect(layoutSlot).not.toBeNull();
    expect(layoutSlot?.className).not.toContain("sticky ");
    expect(stickyShell).not.toBeNull();
    expect(stickyShell?.className).toContain("sticky");
    expect(stickyShell?.className).toContain("overflow-hidden");
    expect(transformLayer).not.toBeNull();
  });

  it("does not animate sticky controls before sticky phase activation", () => {
    const { container } = render(
      <StickyControls
        activeTab="all"
        query=""
        sortMode="grouped"
        hiddenProgress={1}
        isStickyActive={false}
        onQueryChange={vi.fn()}
        onSortToggle={vi.fn()}
        onTabChange={vi.fn()}
      />,
    );

    const transformLayer = container.querySelector<HTMLElement>(".sticky-controls-transform-layer");
    expect(transformLayer).not.toBeNull();
    expect(transformLayer?.style.transform).toBe("none");
    expect(transformLayer?.style.opacity).toBe("1");
    expect(transformLayer?.style.transition).toBe("none");
    expect(transformLayer?.style.willChange).toBe("");
  });

  it("uses measured hidden offsets for sticky shell and transform layer when hidden", () => {
    const { container } = render(
      <StickyControls
        activeTab="all"
        query=""
        sortMode="grouped"
        hiddenProgress={1}
        hiddenOffsetPx={144}
        isStickyActive
        onQueryChange={vi.fn()}
        onSortToggle={vi.fn()}
        onTabChange={vi.fn()}
      />,
    );

    const layoutSlot = container.querySelector<HTMLElement>(".sticky-controls-layout-slot");
    const stickyShell = container.querySelector<HTMLElement>(".sticky-controls-sticky-shell");
    const transformLayer = container.querySelector<HTMLElement>(".sticky-controls-transform-layer");

    expect(layoutSlot?.style.transform).toBe("");
    expect(stickyShell?.style.transform).toBe("translate3d(0, -64px, 0)");
    expect(stickyShell?.style.willChange).toBe("transform");
    expect(stickyShell?.style.transitionProperty).toBe("transform");
    expect(stickyShell?.style.transitionDuration).toBe("280ms");
    expect(stickyShell?.style.transitionTimingFunction).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    expect(stickyShell?.style.transitionDelay).toBe("0ms");
    expect(transformLayer).not.toBeNull();
    expect(transformLayer?.style.transform).toBe("translate3d(0, -144px, 0)");
    expect(transformLayer?.style.transitionProperty).toBe("transform");
    expect(transformLayer?.style.transitionDuration).toBe("280ms");
    expect(transformLayer?.style.transitionTimingFunction).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    expect(transformLayer?.style.transitionDelay).toBe("0ms");
    expect(transformLayer?.style.opacity).toBe("1");
  });

  it("updates sticky controls transform from hidden to visible and keeps controls mounted", () => {
    const { container, rerender } = render(
      <StickyControls
        activeTab="all"
        query="ronaldo"
        sortMode="grouped"
        hiddenProgress={1}
        hiddenOffsetPx={144}
        isStickyActive
        onQueryChange={vi.fn()}
        onSortToggle={vi.fn()}
        onTabChange={vi.fn()}
      />,
    );

    const transformLayer = container.querySelector<HTMLElement>(".sticky-controls-transform-layer");
    const searchInput = container.querySelector<HTMLInputElement>("input");
    const filterButton = container.querySelector<HTMLButtonElement>(
      'button[title="filters.sort.alphabetical"]',
    );

    expect(transformLayer).not.toBeNull();
    expect(transformLayer?.style.transform).toBe("translate3d(0, -144px, 0)");
    expect(transformLayer?.style.transitionDelay).toBe("0ms");
    expect(transformLayer?.style.opacity).toBe("1");
    expect(container.querySelector('[data-testid="animated-tabs"]')).not.toBeNull();
    expect(searchInput?.value).toBe("ronaldo");
    expect(filterButton).not.toBeNull();

    rerender(
      <StickyControls
        activeTab="all"
        query="ronaldo"
        sortMode="grouped"
        hiddenProgress={0.5}
        hiddenOffsetPx={144}
        isStickyActive
        onQueryChange={vi.fn()}
        onSortToggle={vi.fn()}
        onTabChange={vi.fn()}
      />,
    );
    expect(transformLayer?.style.transform).toBe("translate3d(0, -144px, 0)");
    expect(transformLayer?.style.transitionDelay).toBe("0ms");
    expect(transformLayer?.style.opacity).toBe("1");
    expect(container.querySelector('[data-testid="animated-tabs"]')).not.toBeNull();
    expect(searchInput?.value).toBe("ronaldo");
    expect(filterButton).not.toBeNull();

    rerender(
      <StickyControls
        activeTab="all"
        query="ronaldo"
        sortMode="grouped"
        hiddenProgress={0}
        hiddenOffsetPx={144}
        isStickyActive
        onQueryChange={vi.fn()}
        onSortToggle={vi.fn()}
        onTabChange={vi.fn()}
      />,
    );
    expect(transformLayer?.style.transform).toBe("translate3d(0, 0, 0)");
    expect(transformLayer?.style.transitionDelay).toBe("80ms");
    expect(transformLayer?.style.opacity).toBe("1");
    expect(container.querySelector('[data-testid="animated-tabs"]')).not.toBeNull();
    expect(searchInput?.value).toBe("ronaldo");
    expect(filterButton).not.toBeNull();
  });

  it("keeps tabs, search, and filter inside the same transform layer and visible at tabsProgress 0", () => {
    const { container } = render(
      <StickyControls
        activeTab="all"
        query="messi"
        sortMode="grouped"
        hiddenProgress={0}
        hiddenOffsetPx={144}
        isStickyActive
        onQueryChange={vi.fn()}
        onSortToggle={vi.fn()}
        onTabChange={vi.fn()}
      />,
    );

    const transformLayer = container.querySelector<HTMLElement>(".sticky-controls-transform-layer");
    const tabs = transformLayer?.querySelector<HTMLElement>('[data-testid="animated-tabs"]');
    const searchInput = transformLayer?.querySelector<HTMLInputElement>("input");
    const filterButton = transformLayer?.querySelector<HTMLButtonElement>(
      'button[title="filters.sort.alphabetical"]',
    );

    expect(transformLayer).not.toBeNull();
    expect(transformLayer?.style.transform).toBe("translate3d(0, 0, 0)");
    expect(transformLayer?.style.transitionProperty).toBe("transform");
    expect(transformLayer?.style.transitionDuration).toBe("280ms");
    expect(transformLayer?.style.transitionTimingFunction).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    expect(transformLayer?.style.transitionDelay).toBe("80ms");
    expect(transformLayer?.style.opacity).toBe("1");
    expect(tabs).not.toBeNull();
    expect(searchInput).not.toBeNull();
    expect(searchInput?.value).toBe("messi");
    expect(filterButton).not.toBeNull();
  });

  it("keeps speed dial visible before sticky-phase hide progress starts", () => {
    const { container } = render(
      <GlobalSpeedDial isHidden={false} hiddenProgress={0} />,
    );

    const dial = container.querySelector(".speed-dial-container");
    expect(dial).not.toBeNull();
    expect(dial?.className).not.toContain("is-hidden");
    expect((dial as HTMLDivElement).style.opacity).toBe("1");
  });

  it("hides speed dial with scroll progress and also when explicitly hidden", () => {
    const { container, rerender } = render(
      <GlobalSpeedDial isHidden={false} hiddenProgress={1} isScrollControlled />,
    );

    const dial = container.querySelector(".speed-dial-container");
    expect(dial).not.toBeNull();
    expect(dial?.className).toContain("is-hidden");
    expect((dial as HTMLDivElement).style.opacity).toBe("0");
    expect((dial as HTMLDivElement).style.pointerEvents).toBe("none");
    expect((dial as HTMLDivElement).style.transition).toBe("none");

    rerender(<GlobalSpeedDial isHidden hiddenProgress={0} isScrollControlled />);
    expect((dial as HTMLDivElement).style.opacity).toBe("0");
    expect((dial as HTMLDivElement).style.pointerEvents).toBe("none");
  });
});
