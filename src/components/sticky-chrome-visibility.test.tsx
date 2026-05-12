/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
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

describe("sticky chrome visibility styles", () => {
  it("applies progressive translate style to the top bar", () => {
    render(
      <TopBar
        collectionName="StickerOS"
        shareState="idle"
        pendingAddStickersCount={0}
        hiddenProgress={0.5}
        onShare={vi.fn()}
        onAddStickers={vi.fn()}
        onTrade={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    const header = screen.getByText("StickerOS").closest("header");
    expect(header).not.toBeNull();
    expect(header?.style.transform).toBe("translate3d(0, -28px, 0)");
    expect(header?.style.opacity).toBe("0.91");
  });

  it("moves sticky controls up with the header stack while hiding", () => {
    render(
      <StickyControls
        activeTab="all"
        query=""
        sortMode="grouped"
        hiddenProgress={1}
        onQueryChange={vi.fn()}
        onSortToggle={vi.fn()}
        onTabChange={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("common.searchPlaceholder");
    const stickySection = input.closest("section");
    expect(stickySection).not.toBeNull();
    expect(stickySection?.style.transform).toBe("translate3d(0, calc(-56px - 100%), 0)");
  });

  it("hides speed dial with scroll progress and also when explicitly hidden", () => {
    const { container, rerender } = render(
      <GlobalSpeedDial isHidden={false} hiddenProgress={1} />,
    );

    const dial = container.querySelector(".speed-dial-container");
    expect(dial).not.toBeNull();
    expect(dial?.className).toContain("is-hidden");
    expect((dial as HTMLDivElement).style.opacity).toBe("0");
    expect((dial as HTMLDivElement).style.pointerEvents).toBe("none");

    rerender(<GlobalSpeedDial isHidden hiddenProgress={0} />);
    expect((dial as HTMLDivElement).style.opacity).toBe("0");
    expect((dial as HTMLDivElement).style.pointerEvents).toBe("none");
  });
});
