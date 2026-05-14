// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoCapturePanel } from "./photo-capture-panel";
import { useAssistantStore } from "@/lib/assistant-store";
import { useAddStickersPendingStore } from "./add-stickers-session";

beforeEach(() => {
  useAssistantStore.setState({
    activeMode: "photo",
    addStickersOpen: false,
    queuedPhotoCapture: null,
  });
  useAddStickersPendingStore.getState().clearPending();
  useAddStickersPendingStore.persist.clearStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("PhotoCapturePanel", () => {
  it("renders panel content when photo mode is active", () => {
    render(<PhotoCapturePanel />);

    const panel = screen.getByRole("dialog", { name: "Capture photo" });
    expect(panel.className).toContain("photo-capture-panel");
    expect(screen.getByRole("button", { name: "Take photo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose from gallery" })).toBeTruthy();
  });

  it("does not render when photo mode is not active", () => {
    useAssistantStore.setState({ activeMode: "closed" });
    render(<PhotoCapturePanel />);

    expect(screen.queryByRole("dialog", { name: "Capture photo" })).toBeNull();
  });

  it("closes on escape", async () => {
    const user = userEvent.setup();
    render(<PhotoCapturePanel />);

    await user.keyboard("{Escape}");
    await waitForTimeout(260);
    expect(useAssistantStore.getState().activeMode).toBe("closed");
  });

  it("closes from the close button", async () => {
    const user = userEvent.setup();
    render(<PhotoCapturePanel />);

    await user.click(screen.getByRole("button", { name: "Close photo panel" }));
    await waitForTimeout(260);
    expect(useAssistantStore.getState().activeMode).toBe("closed");
  });

  it("keeps the panel open when launching the gallery picker", async () => {
    const user = userEvent.setup();
    render(<PhotoCapturePanel />);

    await user.click(screen.getByRole("button", { name: "Choose from gallery" }));
    await waitForTimeout(260);

    expect(useAssistantStore.getState().activeMode).toBe("photo");
    expect(screen.getByRole("dialog", { name: "Capture photo" })).toBeTruthy();
  });

  it("keeps the panel open when launching the camera picker", async () => {
    const user = userEvent.setup();
    render(<PhotoCapturePanel />);

    await user.click(screen.getByRole("button", { name: "Take photo" }));
    await waitForTimeout(260);

    expect(useAssistantStore.getState().activeMode).toBe("photo");
    expect(screen.getByRole("dialog", { name: "Capture photo" })).toBeTruthy();
  });

  it("analyzes selected gallery photo and transitions to review on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            stickerId: "ARG7",
            stickerOsIndex: 7,
            code: "ARG7",
            label: "ARG 7",
            groupLabel: "ARG",
            number: "7",
            confidence: 0.9,
            selected: true,
            source: "ARG7",
          },
        ],
        unresolved: [],
        provider: "deterministic",
        source: "image",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PhotoCapturePanel />);
    const file = new File(["photo"], "capture.jpg", { type: "image/jpeg" });
    const galleryInput = screen.getByLabelText("Choose from gallery");

    fireEvent.change(galleryInput, { target: { files: [file] } });
    expect(await screen.findByText("Confirm stickers")).toBeTruthy();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useAssistantStore.getState().activeMode).toBe("photo");
    expect(useAssistantStore.getState().addStickersOpen).toBe(false);
    expect(screen.getByRole("button", { name: "Remove ARG7" })).toBeTruthy();
  });

  it("shows inline empty-result feedback and stays in capture mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [],
        unresolved: [],
        provider: "deterministic",
        source: "image",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PhotoCapturePanel />);

    const file = new File(["photo"], "empty.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose from gallery"), { target: { files: [file] } });

    expect(await screen.findByText("No stickers found")).toBeTruthy();
    expect(screen.getByText("Try a clearer code like MEX 13, FWC 00, or CC14.")).toBeTruthy();
    expect(screen.queryByText("Confirm stickers")).toBeNull();
    expect(useAssistantStore.getState().activeMode).toBe("photo");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows inline error feedback and stays in capture mode when analysis fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        code: "AI_PROVIDER_ERROR",
        message: "Provider request failed.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PhotoCapturePanel />);

    const file = new File(["photo"], "error.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose from gallery"), { target: { files: [file] } });

    expect(await screen.findByText("Could not analyze stickers")).toBeTruthy();
    expect(screen.getByText("Provider request failed.")).toBeTruthy();
    expect(screen.queryByText("Confirm stickers")).toBeNull();
    expect(useAssistantStore.getState().activeMode).toBe("photo");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks to review pending stickers before starting a new photo capture", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            stickerId: "ARG7",
            stickerOsIndex: 7,
            code: "ARG7",
            label: "ARG 7",
            groupLabel: "ARG",
            number: "7",
            confidence: 0.9,
            selected: true,
            source: "ARG7",
          },
        ],
        unresolved: [],
        provider: "deterministic",
        source: "image",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    useAddStickersPendingStore.getState().appendResult({
      candidates: [
        {
          stickerId: "MEX13",
          stickerOsIndex: 13,
          code: "MEX13",
          label: "MEX 13",
          groupLabel: "MEX",
          number: "13",
          confidence: 1,
          selected: true,
          source: "MEX13",
        },
      ],
      unresolved: [],
      provider: "deterministic",
      source: "image",
    });

    render(<PhotoCapturePanel />);

    const file = new File(["photo"], "pending.jpg", { type: "image/jpeg" });
    const galleryInput = screen.getByLabelText("Choose from gallery");
    fireEvent.change(galleryInput, { target: { files: [file] } });

    expect(screen.getByText("Pending stickers need review")).toBeTruthy();
    expect(useAssistantStore.getState().queuedPhotoCapture).toBe(null);

    await user.click(screen.getByRole("button", { name: "Start new capture" }));
    expect(await screen.findByText("Confirm stickers")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove MEX13" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove ARG7" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useAssistantStore.getState().activeMode).toBe("photo");
  });
});

function waitForTimeout(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
