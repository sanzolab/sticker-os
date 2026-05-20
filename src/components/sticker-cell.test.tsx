// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StickerTile } from "./sticker-cell";
import { stickers } from "@/lib/sticker-data";

const sticker = stickers.find((s) => !s.special && s.number) ?? stickers[0]!;
const specialSticker = stickers.find((s) => s.special) ?? stickers[0]!;

describe("StickerTile", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe("visual states", () => {
    it("renders missing state with dashed border and muted text", () => {
      const { container } = render(
        <StickerTile sticker={sticker} copies={0} interactive={false} />,
      );
      const tile = container.querySelector("[class*='border-dashed']");
      expect(tile?.className).toContain("text-muted-foreground/40");
      expect(tile?.className).not.toContain("text-amber-700/45");
    });

    it("renders owned state with solid border and foreground text", () => {
      const { container } = render(
        <StickerTile sticker={sticker} copies={1} interactive={false} />,
      );
      const tile = container.querySelector("[class*='bg-primary']");
      expect(tile?.className).toContain("text-foreground");
      expect(tile?.className).not.toContain("bg-amber-100/70");
    });

    it("renders duplicate badge when copies > 1", () => {
      const { container } = render(
        <StickerTile sticker={sticker} copies={3} interactive={false} />,
      );
      const badge = container.querySelector(
        ".rounded-full.bg-primary.text-xs",
      );
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toBe("2");
    });

    it("does not render duplicate badge when copies <= 1", () => {
      const { container } = render(
        <StickerTile sticker={sticker} copies={1} interactive={false} />,
      );
      const badges = container.querySelectorAll(
        ".rounded-full.bg-primary.text-xs",
      );
      expect(badges.length).toBe(0);
    });

    it("renders special owned with amber styling", () => {
      const { container } = render(
        <StickerTile
          sticker={specialSticker}
          copies={1}
          interactive={false}
        />,
      );
      const tile = container.querySelector("[class*='bg-amber-100']");
      expect(tile?.className).toContain("!border-amber-300/80");
      expect(tile?.className).toContain("bg-amber-100/70");
      expect(tile?.className).toContain("text-amber-700");
      expect(tile?.className).toContain("dark:!border-amber-400/40");
      expect(tile?.className).toContain("dark:bg-amber-950/20");
      expect(tile?.className).toContain("dark:text-amber-300");
    });

    it("renders special missing with amber dashed border", () => {
      const { container } = render(
        <StickerTile
          sticker={specialSticker}
          copies={0}
          interactive={false}
        />,
      );
      const tile = container.querySelector(
        "[class*='border-dashed'][class*='amber']",
      );
      expect(tile).toBeTruthy();
      expect(tile?.className).toContain("!border-amber-300/60");
      expect(tile?.className).toContain("text-amber-700/45");
      expect(tile?.className).toContain("dark:!border-amber-500/30");
      expect(tile?.className).toContain("dark:text-muted-foreground/40");
      const mark = container.querySelector("svg");
      const markClasses = mark?.getAttribute("class") ?? "";
      expect(markClasses).toContain("text-amber-300/60");
      expect(markClasses).toContain("dark:text-amber-500/30");
    });
  });

  describe("interactive mode", () => {
    it("renders as button when interactive", () => {
      render(
        <StickerTile sticker={sticker} copies={0} interactive={true} />,
      );
      expect(screen.getByRole("button")).toBeTruthy();
    });

    it("renders as div when non-interactive", () => {
      const { container } = render(
        <StickerTile
          sticker={sticker}
          copies={0}
          interactive={false}
        />,
      );
      expect(container.querySelector("button")).toBeNull();
    });

    it("calls onTap on click", async () => {
      const onTap = vi.fn();
      const user = userEvent.setup();

      render(
        <StickerTile
          sticker={sticker}
          copies={0}
          interactive={true}
          onTap={onTap}
        />,
      );
      await user.click(screen.getByRole("button"));
      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it("calls onLongPress after 450ms hold", () => {
      vi.useFakeTimers();
      const onLongPress = vi.fn();

      render(
        <StickerTile
          sticker={sticker}
          copies={0}
          interactive={true}
          onLongPress={onLongPress}
        />,
      );

      const btn = screen.getByRole("button");
      fireEvent.pointerDown(btn);

      vi.advanceTimersByTime(500);

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it("does not call onTap after long press", () => {
      vi.useFakeTimers();
      const onTap = vi.fn();
      const onLongPress = vi.fn();

      render(
        <StickerTile
          sticker={sticker}
          copies={0}
          interactive={true}
          onTap={onTap}
          onLongPress={onLongPress}
        />,
      );

      const btn = screen.getByRole("button");
      fireEvent.pointerDown(btn);

      vi.advanceTimersByTime(500);

      fireEvent.pointerUp(btn);
      fireEvent.click(btn);

      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(onTap).not.toHaveBeenCalled();
    });

    it("does not call onTap or onLongPress when non-interactive", () => {
      const onTap = vi.fn();
      const onLongPress = vi.fn();

      const { container } = render(
        <StickerTile
          sticker={sticker}
          copies={0}
          interactive={false}
          onTap={onTap}
          onLongPress={onLongPress}
        />,
      );

      const tile = container.firstElementChild;
      if (tile) {
        fireEvent.click(tile);
      }

      expect(onTap).not.toHaveBeenCalled();
      expect(onLongPress).not.toHaveBeenCalled();
    });
  });
});
