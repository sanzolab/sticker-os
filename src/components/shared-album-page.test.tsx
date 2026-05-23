// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AlbumTabPanel } from "./album-tab-panel";
import { useStickerStore } from "@/lib/store";
import { stickers } from "@/lib/sticker-data";
import {
  applyImportStrategy,
  type ImportStrategy,
} from "@/lib/shared-album-import";

globalThis.ResizeObserver = class {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: 100, height: 240 } as DOMRectReadOnly,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

describe("AlbumTabPanel read-only mode", () => {
  afterEach(() => {
    cleanup();
    useStickerStore.setState({
      collectionByStickerId: {},
      settings: {
        locale: "en",
        localeSource: "manual",
        animations: true,
        haptics: true,
        theme: "system",
      },
    });
  });

  const readOnlyCollection: Record<string, number> = {
    [stickers[0]!.id]: 1,
    [stickers[1]!.id]: 2,
    [stickers[2]!.id]: 0,
  };

  it("renders read-only cells as divs, not interactive buttons", () => {
    const { container } = render(
      <AlbumTabPanel
        activeTabIndex={0}
        onTabChange={() => {}}
        collectionByStickerId={readOnlyCollection}
        locale="en"
        query=""
        sortMode="grouped"
        readOnly
      />,
    );

    const stickerButtons = container.querySelectorAll(
      ".aspect-square button",
    );
    expect(stickerButtons.length).toBe(0);
  });

  it("renders duplicate badge for stickers with copies > 1", () => {
    const { container } = render(
      <AlbumTabPanel
        activeTabIndex={0}
        onTabChange={() => {}}
        collectionByStickerId={readOnlyCollection}
        locale="en"
        query=""
        sortMode="grouped"
        readOnly
      />,
    );

    const badges = container.querySelectorAll(
      ".rounded-full.bg-primary.text-xs",
    );
    expect(badges.length).toBe(1);
    expect(badges[0]?.textContent).toBe("1");
  });
});

describe("shared album import strategy", () => {
  const local: Record<string, number> = {
    [stickers[0]!.id]: 1,
    [stickers[1]!.id]: 1,
    [stickers[3]!.id]: 5,
  };

  const shared: Record<string, number> = {
    [stickers[0]!.id]: 3,
    [stickers[2]!.id]: 2,
    [stickers[3]!.id]: 2,
  };

  function getResult(strategy: ImportStrategy) {
    return applyImportStrategy({
      localCollectionByStickerId: local,
      sharedCollectionByStickerId: shared,
      strategy,
    });
  }

  it("replace strategy uses shared counts", () => {
    const result = getResult("replace");
    expect(result[stickers[0]!.id]).toBe(3);
    expect(result[stickers[1]!.id]).toBeUndefined();
    expect(result[stickers[2]!.id]).toBe(2);
    expect(result[stickers[3]!.id]).toBe(2);
  });

  it("add strategy sums local and shared counts", () => {
    const result = getResult("add");
    expect(result[stickers[0]!.id]).toBe(4);
    expect(result[stickers[1]!.id]).toBe(1);
    expect(result[stickers[2]!.id]).toBe(2);
    expect(result[stickers[3]!.id]).toBe(7);
  });

  it("highest strategy keeps the maximum count", () => {
    const result = getResult("highest");
    expect(result[stickers[0]!.id]).toBe(3);
    expect(result[stickers[1]!.id]).toBe(1);
    expect(result[stickers[2]!.id]).toBe(2);
    expect(result[stickers[3]!.id]).toBe(5);
  });
});
