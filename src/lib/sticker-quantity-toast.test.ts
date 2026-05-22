// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getStickerQuantityToastPosition,
  MOBILE_TOAST_QUERY,
  STICKER_QUANTITY_ADD_UNDO_TOAST_ID,
  withStickerQuantityUndoToast,
} from "./sticker-quantity-toast";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sticker quantity toast options", () => {
  it("uses top-center on mobile viewports", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn((query: string) => ({
        matches: query === MOBILE_TOAST_QUERY,
      })),
    });

    expect(getStickerQuantityToastPosition()).toBe("top-center");
  });

  it("uses bottom-center on non-mobile viewports", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({
        matches: false,
      })),
    });

    expect(getStickerQuantityToastPosition()).toBe("bottom-center");
  });

  it("safely falls back to bottom-center without window", () => {
    vi.stubGlobal("window", undefined);
    expect(getStickerQuantityToastPosition()).toBe("bottom-center");
  });

  it("adds stable id and responsive position to toast options", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn((query: string) => ({
        matches: query === MOBILE_TOAST_QUERY,
      })),
    });

    const options = withStickerQuantityUndoToast({
      className: "custom-toast",
      action: {
        label: "Undo",
        onClick: vi.fn(),
      },
    }, STICKER_QUANTITY_ADD_UNDO_TOAST_ID);

    expect(options.className).toBe("custom-toast");
    expect(options.id).toBe(STICKER_QUANTITY_ADD_UNDO_TOAST_ID);
    expect(options.position).toBe("top-center");
  });
});
