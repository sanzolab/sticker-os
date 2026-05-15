// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AddStickersDrawer } from "./add-stickers-drawer";
import { useAddStickersPendingStore } from "./add-stickers-session";
import type { AddStickerCandidate } from "./add-stickers-types";
import { useAssistantStore } from "@/lib/assistant-store";

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
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

beforeEach(() => {
  useAddStickersPendingStore.getState().clearPending();
  useAddStickersPendingStore.persist.clearStorage();
  useAssistantStore.setState({
    activeMode: "closed",
    addStickersOpen: false,
    queuedPhotoCapture: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

describe("AddStickersDrawer", () => {
  it("opens directly in review mode when pending queue already has items", async () => {
    useAddStickersPendingStore.getState().appendResult({
      candidates: [candidate("MEX13", "MEX 13", true)],
      unresolved: [],
      provider: "deterministic",
      source: "text",
    });

    render(<AddStickersDrawer open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("Confirm stickers")).toBeTruthy();
    expect(screen.getByText("MEX 13")).toBeTruthy();
  });

  it("clears pending queue after confirm and closes the drawer", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    useAddStickersPendingStore.getState().appendResult({
      candidates: [candidate("MEX13", "MEX 13", true)],
      unresolved: [],
      provider: "deterministic",
      source: "text",
    });

    render(<AddStickersDrawer open onOpenChange={onOpenChange} />);

    await user.click(screen.getAllByRole("button", { name: "Confirm add selected stickers (1)" })[0]!);

    expect(useAddStickersPendingStore.getState().candidates).toEqual([]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("consumes queued photo capture and analyzes it on open", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [candidate("ARG7", "ARG 7", true)],
        unresolved: [],
        provider: "deterministic",
        source: "image",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    useAssistantStore.setState({
      queuedPhotoCapture: {
        id: 1,
        file: new File(["image"], "capture.jpg", { type: "image/jpeg" }),
      },
    });

    render(<AddStickersDrawer open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("Confirm stickers")).toBeTruthy();
    expect(screen.getByText("ARG 7")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useAssistantStore.getState().queuedPhotoCapture).toBe(null);
  });

  it("times out a stuck queued photo request and returns to capture mode", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    useAssistantStore.setState({
      queuedPhotoCapture: {
        id: 1,
        file: new File(["image"], "capture.jpg", { type: "image/jpeg" }),
      },
    });

    render(<AddStickersDrawer open onOpenChange={vi.fn()} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(screen.getByText("Could not analyze stickers")).toBeTruthy();
    expect(screen.getByText("Analysis took too long. Try again with a clearer photo.")).toBeTruthy();
    expect(screen.queryByText("Analyzing stickers")).toBeNull();
  });

  it("shows preparation error and skips request for non-image queued capture", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    useAssistantStore.setState({
      queuedPhotoCapture: {
        id: 1,
        file: new File(["image"], "capture.txt", { type: "text/plain" }),
      },
    });

    render(<AddStickersDrawer open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("Could not analyze stickers")).toBeTruthy();
    expect(screen.getByText("This photo format could not be prepared on this device. Please try again, select the photo from your gallery, or use a JPEG/PNG image.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function candidate(
  stickerId: string,
  code: string,
  selected: boolean,
): AddStickerCandidate {
  return {
    stickerId,
    stickerOsIndex: Number(code.replace(/\D/g, "")),
    code,
    label: code,
    groupLabel: code.split(" ")[0] ?? code,
    number: code.split(" ")[1] ?? "",
    confidence: 1,
    selected,
    source: code,
  };
}
