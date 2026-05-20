// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareDrawer } from "./share-drawer";
import { useStickerStore } from "@/lib/store";

const buildSharedAlbumLinkDataMock = vi.fn();
const copyTextMock = vi.fn();
const downloadTextMock = vi.fn();

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
  }: HTMLAttributes<HTMLHeadingElement>) => (
    <h2 {...props}>{children}</h2>
  ),
  DrawerDescription: ({
    children,
    ...props
  }: HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props}>{children}</p>
  ),
}));

vi.mock("@/lib/shared-album-link", () => ({
  MAX_SHARED_ALBUM_URL_LENGTH: 1800,
  buildSharedAlbumLinkData: (...args: unknown[]) =>
    buildSharedAlbumLinkDataMock(...args),
}));

vi.mock("./export-actions", () => ({
  copyText: (...args: unknown[]) => copyTextMock(...args),
  downloadText: (...args: unknown[]) => downloadTextMock(...args),
}));

beforeEach(() => {
  cleanup();
  buildSharedAlbumLinkDataMock.mockReset();
  copyTextMock.mockReset();
  downloadTextMock.mockReset();
  useStickerStore.setState((state) => ({
    ...state,
    settings: {
      ...state.settings,
      locale: "en",
    },
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ShareDrawer album link", () => {
  it("keeps button label as Share album link when drawer opens", () => {
    buildSharedAlbumLinkDataMock.mockReturnValue(new Promise(() => {}));

    renderDrawer();

    const shareLinkButton = screen.getByRole("button", {
      name: "Share album link",
    });
    expect(shareLinkButton.getAttribute("disabled")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Preparing link..." }),
    ).toBeNull();
  });

  it("shows Preparing link only during user-triggered action", async () => {
    const user = userEvent.setup();
    copyTextMock.mockResolvedValue(true);

    let resolveBuild: (value: string) => void = () => {};
    const pendingBuild = new Promise<string>((resolve) => {
      resolveBuild = resolve;
    });
    buildSharedAlbumLinkDataMock.mockReturnValue(pendingBuild);

    renderDrawer();

    const button = screen.getByRole("button", { name: "Share album link" });
    await user.click(button);

    const preparingButton = await screen.findByRole("button", {
      name: "Preparing link...",
    });
    expect(preparingButton.getAttribute("disabled")).not.toBeNull();

    resolveBuild("my-data");

    await screen.findByRole("button", { name: "Share album link" });
    expect(copyTextMock).toHaveBeenCalledTimes(1);
  });

  it("shares precomputed url when native share is available", async () => {
    const user = userEvent.setup();
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: shareMock,
    });
    buildSharedAlbumLinkDataMock.mockResolvedValue("my-data");

    renderDrawer();

    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(shareMock.mock.calls[0]?.[0]?.url).toContain("/shared-album?data=");
    expect(copyTextMock).not.toHaveBeenCalled();
  });

  it("falls back to clipboard copy when native share fails", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error("blocked")),
    });
    copyTextMock.mockResolvedValue(true);
    buildSharedAlbumLinkDataMock.mockResolvedValue("my-data");

    renderDrawer();

    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    expect(copyTextMock).toHaveBeenCalledTimes(1);
  });

  it("shows manual fallback when clipboard copy fails", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    copyTextMock.mockResolvedValue(false);
    buildSharedAlbumLinkDataMock.mockResolvedValue("my-data");

    renderDrawer();

    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    expect(
      await screen.findByText(
        "Automatic copy was blocked. You can copy this link manually.",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Shared album link")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Preparing link..." }),
    ).toBeNull();
  });

  it("shows too-long error only after user taps share album link", async () => {
    const user = userEvent.setup();
    buildSharedAlbumLinkDataMock.mockResolvedValue("x".repeat(5000));

    renderDrawer();

    expect(
      screen.queryByText(
        "This album is too large to share as a link on this device.",
      ),
    ).toBeNull();

    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    await screen.findByText(
      "This album is too large to share as a link on this device.",
    );
    expect(button.getAttribute("disabled")).toBeNull();
  });

  it("shows generic error and recovers from rejected generation", async () => {
    const user = userEvent.setup();
    buildSharedAlbumLinkDataMock.mockRejectedValue(new Error("boom"));

    renderDrawer();

    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    await screen.findByText(
      "Could not prepare the shared album link. Try reopening share options.",
    );
    expect(
      await screen.findByRole("button", { name: "Share album link" }),
    ).toBeTruthy();
  });

  it("shows generic error and recovers from timed-out generation", async () => {
    const user = userEvent.setup();
    buildSharedAlbumLinkDataMock.mockReturnValue(new Promise(() => {}));

    renderDrawer();

    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    await screen.findByText(
      "Could not prepare the shared album link. Try reopening share options.",
      {},
      { timeout: 3000 },
    );
    await screen.findByRole("button", { name: "Share album link" });
  });

  it("keeps TXT sharing behavior unchanged", async () => {
    const user = userEvent.setup();
    copyTextMock.mockResolvedValue(true);
    buildSharedAlbumLinkDataMock.mockResolvedValue("my-data");

    renderDrawer();

    await user.click(screen.getByRole("button", { name: "Copy TXT" }));

    await waitFor(() => {
      expect(copyTextMock).toHaveBeenCalledTimes(1);
    });
    expect(downloadTextMock).not.toHaveBeenCalled();
  });
});

function renderDrawer() {
  return render(
    <ShareDrawer
      open
      onOpenChange={vi.fn()}
      collectionName="StickerOS"
      collectionByStickerId={{}}
    />,
  );
}

describe("ShareDrawer album link integration with real buildSharedAlbumLinkData", () => {
  beforeEach(() => {
    copyTextMock.mockReset();
  });

  it("generates valid link with real data and shows manual fallback when clipboard fails", async () => {
    const actual = await vi.importActual<
      typeof import("@/lib/shared-album-link")
    >("@/lib/shared-album-link");
    buildSharedAlbumLinkDataMock.mockImplementation(
      actual.buildSharedAlbumLinkData,
    );

    copyTextMock.mockResolvedValue(false);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });

    const stickersModule =
      await vi.importActual<typeof import("@/lib/sticker-data")>(
        "@/lib/sticker-data",
      );
    const collection: Record<string, number> = {};
    for (let i = 0; i < 5; i += 1) {
      collection[stickersModule.stickers[i].id] = 1;
    }

    render(
      <ShareDrawer
        open
        onOpenChange={vi.fn()}
        collectionName="IntegrationTest"
        collectionByStickerId={collection}
      />,
    );

    const user = userEvent.setup();
    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    // Should NOT show the generic prepare error
    expect(
      screen.queryByText(
        "Could not prepare the shared album link. Try reopening share options.",
      ),
    ).toBeNull();

    // Should show manual copy fallback
    await screen.findByText(
      "Automatic copy was blocked. You can copy this link manually.",
    );
    expect(screen.getByLabelText("Shared album link")).toBeTruthy();
  });

  it("does not show generic prepare error when link succeeds but share fails", async () => {
    const actual = await vi.importActual<
      typeof import("@/lib/shared-album-link")
    >("@/lib/shared-album-link");
    buildSharedAlbumLinkDataMock.mockImplementation(
      actual.buildSharedAlbumLinkData,
    );

    const shareMock = vi.fn().mockRejectedValue(new Error("share blocked"));
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: shareMock,
    });
    copyTextMock.mockResolvedValue(false);

    const stickersModule =
      await vi.importActual<typeof import("@/lib/sticker-data")>(
        "@/lib/sticker-data",
      );
    const collection: Record<string, number> = {};
    for (let i = 0; i < 5; i += 1) {
      collection[stickersModule.stickers[i].id] = 1;
    }

    render(
      <ShareDrawer
        open
        onOpenChange={vi.fn()}
        collectionName="IntegrationTest"
        collectionByStickerId={collection}
      />,
    );

    const user = userEvent.setup();
    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    // Native share was attempted with a valid URL
    expect(shareMock).toHaveBeenCalledTimes(1);
    const shareArg = shareMock.mock.calls[0]?.[0] as
      | { url?: string }
      | undefined;
    expect(shareArg?.url).toContain("/shared-album?data=");

    // Clipboard fallback was attempted
    expect(copyTextMock).toHaveBeenCalledTimes(1);

    // Should show manual fallback, NOT generic prepare error
    expect(
      screen.queryByText(
        "Could not prepare the shared album link. Try reopening share options.",
      ),
    ).toBeNull();
    await screen.findByText(
      "Automatic copy was blocked. You can copy this link manually.",
    );
  });

  it("shows generic prepare error only for actual payload generation failures", async () => {
    const actual = await vi.importActual<
      typeof import("@/lib/shared-album-link")
    >("@/lib/shared-album-link");
    buildSharedAlbumLinkDataMock.mockImplementation(
      actual.buildSharedAlbumLinkData,
    );

    // Pass invalid collectionByStickerId to trigger a payload generation error
    render(
      <ShareDrawer
        open
        onOpenChange={vi.fn()}
        collectionName="Test"
        collectionByStickerId={null as unknown as Record<string, number>}
      />,
    );

    const user = userEvent.setup();
    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    await screen.findByText(
      "Could not prepare the shared album link. Try reopening share options.",
    );
  });

  it("falls back to JSON payload when CompressionStream is unavailable", async () => {
    const original = globalThis.CompressionStream;
    delete (globalThis as Record<string, unknown>).CompressionStream;

    const actual = await vi.importActual<
      typeof import("@/lib/shared-album-link")
    >("@/lib/shared-album-link");
    buildSharedAlbumLinkDataMock.mockImplementation(
      actual.buildSharedAlbumLinkData,
    );

    copyTextMock.mockResolvedValue(true);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });

    const stickersModule =
      await vi.importActual<typeof import("@/lib/sticker-data")>(
        "@/lib/sticker-data",
      );
    const collection: Record<string, number> = {};
    collection[stickersModule.stickers[0].id] = 1;

    render(
      <ShareDrawer
        open
        onOpenChange={vi.fn()}
        collectionName="Test"
        collectionByStickerId={collection}
      />,
    );

    const user = userEvent.setup();
    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    // Link was generated successfully (clipboard copy fired with a real URL)
    expect(copyTextMock).toHaveBeenCalledTimes(1);
    const copiedUrl = copyTextMock.mock.calls[0]?.[0] as string | undefined;
    expect(copiedUrl).toContain("/shared-album?data=json.");

    // No generic error
    expect(
      screen.queryByText(
        "Could not prepare the shared album link. Try reopening share options.",
      ),
    ).toBeNull();

    if (original) {
      (globalThis as Record<string, unknown>).CompressionStream = original;
    }
  });
});
