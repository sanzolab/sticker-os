// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StickerSection } from "./sticker-section";
import { stickerGroups, stickers } from "@/lib/sticker-data";

vi.mock("@/components/use-section-lifecycle", () => ({
  useSectionLifecycle: () => ({
    ref: { current: null },
    phase: "visible",
    height: null,
    skipEnter: true,
  }),
}));

vi.mock("@/lib/section-lifecycle", () => ({
  getSectionLifecycleRegistry: () => ({
    getCollapsed: () => false,
    setCollapsed: vi.fn(),
  }),
}));

vi.mock("@/lib/store", () => ({
  useStickerStore: (selector: (state: { settings: { locale: "en" | "es" } }) => unknown) =>
    selector({ settings: { locale: "es" } }),
}));

describe("StickerSection", () => {
  it("renders localized country names in Spanish", () => {
    const mexicoGroup = stickerGroups.find((group) => group.id === "mex");
    const mexicoStickers = stickers.filter((sticker) => sticker.groupId === "mex");

    if (!mexicoGroup || mexicoStickers.length === 0) {
      throw new Error("Expected Mexico sticker fixtures to exist");
    }

    render(
      <StickerSection
        active
        group={mexicoGroup}
        stickers={mexicoStickers}
        missing={10}
        duplicates={0}
        collectionByStickerId={{}}
      />,
    );

    expect(screen.getByRole("heading", { name: /MEX - México/i })).toBeTruthy();
  });

  it("renders localized FWC section labels in Spanish", () => {
    const trophyGroup = stickerGroups.find((group) => group.id === "fwc-trophy");
    const trophyStickers = stickers.filter(
      (sticker) => sticker.groupId === "fwc-trophy",
    );

    if (!trophyGroup || trophyStickers.length === 0) {
      throw new Error("Expected FWC trophy sticker fixtures to exist");
    }

    render(
      <StickerSection
        active
        group={trophyGroup}
        stickers={trophyStickers}
        missing={2}
        duplicates={0}
        collectionByStickerId={{}}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /FWC - Especiales/i }),
    ).toBeTruthy();
  });
});
