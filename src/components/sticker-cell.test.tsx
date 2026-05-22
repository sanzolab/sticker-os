// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StickerCell, StickerTile } from "./sticker-cell";
import { getCompactStickerCode, stickers } from "@/lib/sticker-data";
import {
  STICKER_QUANTITY_ADD_UNDO_TOAST_ID,
  STICKER_QUANTITY_REMOVE_UNDO_TOAST_ID,
} from "@/lib/sticker-quantity-toast";
import { useStickerStore } from "@/lib/store";

const { toastMock, toastSuccessMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(toastMock, {
    success: toastSuccessMock,
  }),
}));

const sticker = stickers.find((s) => !s.special && s.number) ?? stickers[0]!;
const specialSticker = stickers.find((s) => s.special) ?? stickers[0]!;

describe("StickerTile", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    toastMock.mockReset();
    toastSuccessMock.mockReset();
    useStickerStore.setState((state) => ({
      ...state,
      collectionByStickerId: {},
      settings: {
        ...state.settings,
        haptics: false,
        localeSource: "manual",
      },
    }));
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

describe("StickerCell", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    toastMock.mockReset();
    toastSuccessMock.mockReset();
    useStickerStore.setState((state) => ({
      ...state,
      collectionByStickerId: {},
      settings: {
        ...state.settings,
        haptics: false,
        localeSource: "manual",
      },
    }));
  });

  it("adds sticker and undo restores previous copies", async () => {
    const user = userEvent.setup();
    useStickerStore.setState((state) => ({
      ...state,
      collectionByStickerId: { [sticker.id]: 0 },
      settings: {
        ...state.settings,
        haptics: false,
        locale: "en",
        localeSource: "manual",
      },
    }));

    render(
      <StickerCell
        sticker={sticker}
        onEditDuplicates={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(useStickerStore.getState().collectionByStickerId[sticker.id]).toBe(1);

    const toastCall = toastSuccessMock.mock.calls.at(-1);
    expect(toastCall).toBeTruthy();
    const title = toastCall?.[0];
    expect(title).toBeTruthy();

    const code = getCompactStickerCode(sticker);
    const { unmount } = render(<>{title}</>);
    const chip = screen.getByTestId("sticker-toast-code-chip");
    expect(chip.textContent).toBe(code);
    expect(chip.className).toContain("border-emerald-500/35");
    expect(chip.className).toContain("bg-emerald-500/15");
    expect(chip.parentElement?.textContent).toBe(`Sticker ${code} added`);
    unmount();

    const action = toastCall?.[1]?.action;
    expect(toastCall?.[1]?.id).toBe(STICKER_QUANTITY_ADD_UNDO_TOAST_ID);
    expect(toastCall?.[1]?.position).toBe("bottom-center");
    expect(action?.label).toBe("Undo");
    action?.onClick?.();

    expect(useStickerStore.getState().collectionByStickerId[sticker.id]).toBeUndefined();
  });

  it("removes sticker on long press and undo restores previous copies", () => {
    vi.useFakeTimers();
    useStickerStore.setState((state) => ({
      ...state,
      collectionByStickerId: { [sticker.id]: 1 },
      settings: {
        ...state.settings,
        haptics: false,
        locale: "en",
        localeSource: "manual",
      },
    }));

    render(
      <StickerCell
        sticker={sticker}
        onEditDuplicates={vi.fn()}
      />,
    );

    const button = screen.getByRole("button");
    fireEvent.pointerDown(button);
    vi.advanceTimersByTime(500);

    expect(useStickerStore.getState().collectionByStickerId[sticker.id]).toBeUndefined();

    expect(toastSuccessMock).not.toHaveBeenCalled();
    const toastCall = toastMock.mock.calls.at(-1);
    expect(toastCall).toBeTruthy();
    const title = toastCall?.[0];
    expect(title).toBeTruthy();

    const code = getCompactStickerCode(sticker);
    const { unmount } = render(<>{title}</>);
    const chip = screen.getByTestId("sticker-toast-code-chip");
    expect(chip.textContent).toBe(code);
    expect(chip.className).toContain("border-red-500/30");
    expect(chip.className).toContain("bg-red-500/10");
    expect(chip.parentElement?.textContent).toBe(`Sticker ${code} removed`);
    unmount();

    const options = toastCall?.[1];
    expect(options?.className).toContain("border-red-500/25");
    expect(options?.classNames?.actionButton).toContain("bg-red-700");
    expect(options?.id).toBe(STICKER_QUANTITY_REMOVE_UNDO_TOAST_ID);
    expect(options?.position).toBe("bottom-center");

    const action = options?.action;
    expect(action?.label).toBe("Undo");
    action?.onClick?.();

    expect(useStickerStore.getState().collectionByStickerId[sticker.id]).toBe(1);
  });

  it("reuses the same toast id for rapid quantity changes", async () => {
    const user = userEvent.setup();
    useStickerStore.setState((state) => ({
      ...state,
      collectionByStickerId: { [sticker.id]: 0 },
      settings: {
        ...state.settings,
        haptics: false,
        locale: "en",
        localeSource: "manual",
      },
    }));

    render(
      <StickerCell
        sticker={sticker}
        onEditDuplicates={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));

    expect(toastSuccessMock).toHaveBeenCalledTimes(2);
    const firstOptions = toastSuccessMock.mock.calls[0]?.[1];
    const secondOptions = toastSuccessMock.mock.calls[1]?.[1];
    expect(firstOptions?.id).toBe(STICKER_QUANTITY_ADD_UNDO_TOAST_ID);
    expect(secondOptions?.id).toBe(STICKER_QUANTITY_ADD_UNDO_TOAST_ID);
  });

  it("reuses remove toast id for rapid remove actions and keeps red styles", () => {
    vi.useFakeTimers();
    useStickerStore.setState((state) => ({
      ...state,
      collectionByStickerId: { [sticker.id]: 1 },
      settings: {
        ...state.settings,
        haptics: false,
        locale: "en",
        localeSource: "manual",
      },
    }));

    render(
      <StickerCell
        sticker={sticker}
        onEditDuplicates={vi.fn()}
      />,
    );

    const button = screen.getByRole("button");
    fireEvent.pointerDown(button);
    vi.advanceTimersByTime(500);

    useStickerStore.getState().setStickerCopies(sticker.id, 1);
    fireEvent.pointerDown(button);
    vi.advanceTimersByTime(500);

    expect(toastMock).toHaveBeenCalledTimes(2);
    const firstOptions = toastMock.mock.calls[0]?.[1];
    const secondOptions = toastMock.mock.calls[1]?.[1];
    expect(firstOptions?.id).toBe(STICKER_QUANTITY_REMOVE_UNDO_TOAST_ID);
    expect(secondOptions?.id).toBe(STICKER_QUANTITY_REMOVE_UNDO_TOAST_ID);
    expect(secondOptions?.className).toContain("border-red-500/25");
    expect(secondOptions?.classNames?.actionButton).toContain("bg-red-700");
  });
});
