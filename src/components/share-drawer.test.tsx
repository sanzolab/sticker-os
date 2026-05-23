// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareDrawer } from "./share-drawer";
import { useStickerStore } from "@/lib/store";

const createShareLinkMock = vi.fn();
const copyTextMock = vi.fn();
const downloadTextMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));

vi.mock("@/lib/share-album", () => ({
  createShareLink: (...args: unknown[]) => createShareLinkMock(...args),
  getShareAbsoluteUrl: (id: string) =>
    `https://sticker.os/shared-album/${id}`,
  getShareUrl: (id: string) => `/shared-album/${id}`,
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

vi.mock("./export-actions", () => ({
  copyText: (...args: unknown[]) => copyTextMock(...args),
  downloadText: (...args: unknown[]) => downloadTextMock(...args),
}));

function successResult(url: string, overrides?: Partial<{ id: string; secret: string }>) {
  if (overrides?.id) {
    return {
      ok: true,
      url,
      kind: "remote",
      ...overrides,
    };
  }
  return { ok: true, url, kind: "inline" };
}

beforeEach(() => {
  cleanup();
  createShareLinkMock.mockReset();
  copyTextMock.mockReset();
  downloadTextMock.mockReset();
  useStickerStore.setState((state) => ({
    ...state,
    settings: {
      ...state.settings,
      locale: "en",
      localeSource: "manual",
    },
    localShareId: undefined,
    localShareSecret: undefined,
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ShareDrawer album link", () => {
  it("keeps button label as Share album link when drawer opens", () => {
    createShareLinkMock.mockReturnValue(new Promise(() => {}));

    renderDrawer();

    const shareLinkButton = screen.getByRole("button", {
      name: "Share album link",
    });
    expect(shareLinkButton.getAttribute("disabled")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Uploading link..." }),
    ).toBeNull();
  });

  it("shows uploading state only during user-triggered action", async () => {
    const user = userEvent.setup();
    copyTextMock.mockResolvedValue(true);

    let resolveBuild: (value: unknown) => void = () => {};
    const pendingBuild = new Promise<unknown>((resolve) => {
      resolveBuild = resolve;
    });
    createShareLinkMock.mockReturnValue(pendingBuild);

    renderDrawer();

    const button = screen.getByRole("button", { name: "Share album link" });
    await user.click(button);

    const uploadingButton = await screen.findByRole("button", {
      name: "Uploading link...",
    });
    expect(uploadingButton.getAttribute("disabled")).not.toBeNull();

    resolveBuild(
      successResult("https://sticker.os/shared-album/abc123abcd"),
    );

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
    createShareLinkMock.mockResolvedValue(
      successResult("https://sticker.os/shared-album/abc123abcd"),
    );

    renderDrawer();

    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(shareMock.mock.calls[0]?.[0]?.url).toContain(
      "/shared-album/abc123abcd",
    );
    expect(copyTextMock).not.toHaveBeenCalled();
  });

  it("falls back to clipboard copy when native share fails", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error("blocked")),
    });
    copyTextMock.mockResolvedValue(true);
    createShareLinkMock.mockResolvedValue(
      successResult("https://sticker.os/shared-album/abc123abcd"),
    );

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
    createShareLinkMock.mockResolvedValue(
      successResult("https://sticker.os/shared-album/abc123abcd"),
    );

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
      screen.queryByRole("button", { name: "Uploading link..." }),
    ).toBeNull();
  });

  it("shows generic error and recovers from rejected generation", async () => {
    const user = userEvent.setup();
    createShareLinkMock.mockRejectedValue(new Error("boom"));

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

  it("shows generic error and recovers from timed-out generation", { timeout: 17000 }, async () => {
    const user = userEvent.setup();
    createShareLinkMock.mockReturnValue(new Promise(() => {}));

    renderDrawer();

    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    await screen.findByText(
      "Could not prepare the shared album link. Try reopening share options.",
      {},
      { timeout: 16000 },
    );
    await screen.findByRole("button", { name: "Share album link" });
  });

  it("shows empty album message when album has no stickers", async () => {
    createShareLinkMock.mockResolvedValue({ ok: false, reason: "empty" });

    renderDrawer();

    await screen.findByText(
      "Your album is empty. Add some stickers before sharing.",
    );
  });

  it("persists local share id when new remote share is created", async () => {
    const user = userEvent.setup();
    copyTextMock.mockResolvedValue(true);
    createShareLinkMock.mockResolvedValue(
      successResult("https://sticker.os/shared-album/newId", {
        id: "newId",
        secret: "newSecret",
      }),
    );

    renderDrawer();

    const button = await screen.findByRole("button", {
      name: "Share album link",
    });
    await user.click(button);

    const state = useStickerStore.getState();
    expect(state.localShareId).toBe("newId");
    expect(state.localShareSecret).toBe("newSecret");
  });

  it("keeps TXT sharing behavior unchanged", async () => {
    const user = userEvent.setup();
    copyTextMock.mockResolvedValue(true);
    createShareLinkMock.mockResolvedValue(
      successResult("https://sticker.os/shared-album/abc123abcd"),
    );

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
