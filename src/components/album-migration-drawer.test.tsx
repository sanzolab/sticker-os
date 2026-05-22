// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlbumMigrationDrawer } from "./album-migration-drawer";
import { useStickerStore } from "@/lib/store";
import { stickers } from "@/lib/sticker-data";

const { parseExchangeQrForMigrationMock, toastErrorMock, toastSuccessMock } =
  vi.hoisted(() => ({
    parseExchangeQrForMigrationMock: vi.fn(),
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
  }));

vi.mock("@/components/ui/app-drawer", () => ({
  AppDrawer: ({
    open,
    children,
  }: {
    open: boolean;
    children: ReactNode;
  }) => (open ? <div>{children}</div> : null),
}));

vi.mock("@/components/ui/drawer", () => ({
  DrawerTitle: ({
    children,
    ...props
  }: HTMLAttributes<HTMLHeadingElement>) => <h2 {...props}>{children}</h2>,
  DrawerDescription: ({
    children,
    ...props
  }: HTMLAttributes<HTMLParagraphElement>) => <p {...props}>{children}</p>,
}));

vi.mock("@/components/trade-scanner", () => ({
  TradeScanner: ({
    onScan,
  }: {
    onScan: (value: string) => void | Promise<void>;
  }) => (
    <button type="button" onClick={() => onScan("mock-qr")}>
      Mock scan
    </button>
  ),
}));

vi.mock("@/lib/album-migration", () => ({
  parseExchangeQrForMigration: (...args: unknown[]) =>
    parseExchangeQrForMigrationMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

const [first, second] = stickers;

beforeEach(() => {
  cleanup();
  parseExchangeQrForMigrationMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
  useStickerStore.setState((state) => ({
    ...state,
    settings: {
      ...state.settings,
      locale: "en",
      localeSource: "manual",
    },
    collectionByStickerId: {
      [first.id]: 1,
      [second.id]: 3,
    },
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AlbumMigrationDrawer", () => {
  it("does not replace progress when user does not confirm", async () => {
    const user = userEvent.setup();

    render(<AlbumMigrationDrawer open onOpenChange={vi.fn()} />);

    const before = useStickerStore.getState().collectionByStickerId;

    await user.click(
      screen.getByRole("button", { name: "I understand, continue to scan" }),
    );
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(useStickerStore.getState().collectionByStickerId).toEqual(before);
  });

  it("keeps progress unchanged on invalid QR", async () => {
    const user = userEvent.setup();
    parseExchangeQrForMigrationMock.mockResolvedValue({
      ok: false,
      errorKey: "trade.error.invalidQr",
    });

    render(<AlbumMigrationDrawer open onOpenChange={vi.fn()} />);

    const before = useStickerStore.getState().collectionByStickerId;

    await user.click(
      screen.getByRole("button", { name: "I understand, continue to scan" }),
    );
    await user.click(screen.getByRole("button", { name: "Mock scan" }));

    expect(
      await screen.findByText(
        "This QR code could not be used to migrate your album. Please check that it is a valid exchange QR.",
      ),
    ).toBeTruthy();
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(useStickerStore.getState().collectionByStickerId).toEqual(before);
  });

  it("replaces progress only after final confirmation", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    parseExchangeQrForMigrationMock.mockResolvedValue({
      ok: true,
      parsed: {
        source: "stickeros",
        name: "",
        missingIds: [],
        ownedIds: [first.id],
        duplicateIds: [first.id],
        unknownStickerCount: 0,
      },
      result: {
        source: "stickeros",
        name: "",
        collectionByStickerId: { [first.id]: 2 },
        summary: {
          collectedCount: 1,
          duplicateStickerCount: 1,
          ignoredStickerCount: 0,
        },
      },
    });

    render(<AlbumMigrationDrawer open onOpenChange={onOpenChange} />);

    const before = useStickerStore.getState().collectionByStickerId;

    await user.click(
      screen.getByRole("button", { name: "I understand, continue to scan" }),
    );
    await user.click(screen.getByRole("button", { name: "Mock scan" }));

    expect(
      await screen.findByText("Review migration data"),
    ).toBeTruthy();
    expect(useStickerStore.getState().collectionByStickerId).toEqual(before);

    await user.click(screen.getAllByRole("button", { name: "Migrate album" })[0]);
    const confirmButtons = await screen.findAllByRole("button", {
      name: "Migrate album",
    });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    expect(useStickerStore.getState().collectionByStickerId).toEqual({
      [first.id]: 2,
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Album migrated successfully.",
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
