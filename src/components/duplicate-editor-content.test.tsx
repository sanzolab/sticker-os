// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DuplicateEditorContent } from "./duplicate-editor-content";
import { stickers } from "@/lib/sticker-data";
import { STICKER_QUANTITY_SAVE_UNDO_TOAST_ID } from "@/lib/sticker-quantity-toast";
import { useStickerStore } from "@/lib/store";

const { toastSuccessMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: toastSuccessMock,
  }),
}));

vi.mock("@/components/ui/app-drawer", () => ({
  AppDrawer: ({
    children,
    onOpenChange,
  }: {
    children: ReactNode;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange(false)}>
        Close
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/drawer", () => ({
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

const sticker = stickers.find((item) => !item.special) ?? stickers[0]!;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  toastSuccessMock.mockReset();
  useStickerStore.setState((state) => ({
    ...state,
    collectionByStickerId: {},
    settings: {
      ...state.settings,
      locale: "en",
      localeSource: "manual",
    },
  }));
});

describe("DuplicateEditorContent", () => {
  it("shows quantity toast with stable id and undo restores previous copies", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({
        matches: true,
      })),
    });

    useStickerStore.setState((state) => ({
      ...state,
      collectionByStickerId: { [sticker.id]: 0 },
      settings: {
        ...state.settings,
        locale: "en",
        localeSource: "manual",
      },
    }));

    const onOpenChange = vi.fn();
    render(
      <DuplicateEditorContent
        sticker={sticker}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    const toastCall = toastSuccessMock.mock.calls.at(-1);
    expect(toastCall).toBeTruthy();
    expect(toastCall?.[1]?.id).toBe(STICKER_QUANTITY_SAVE_UNDO_TOAST_ID);
    expect(toastCall?.[1]?.position).toBe("top-center");
    expect(toastCall?.[1]?.action?.label).toBe("Undo");
    expect(useStickerStore.getState().collectionByStickerId[sticker.id]).toBe(1);

    toastCall?.[1]?.action?.onClick?.();
    expect(useStickerStore.getState().collectionByStickerId[sticker.id]).toBeUndefined();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
