// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  vi.useRealTimers();
  vi.restoreAllMocks();
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
    expect(screen.getByLabelText("Take photo").getAttribute("accept")).toBe("image/*");
    expect(screen.getByLabelText("Choose from gallery").getAttribute("accept")).toBe("image/*");
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

  it("normalizes camera captures before upload", async () => {
    mockCanvasJpegConversion({ width: 4000, height: 3000 });
    let uploadedFile: File | null = null;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      uploadedFile = (init?.body as FormData).get("file") as File;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          candidates: [],
          unresolved: [],
          provider: "deterministic",
          source: "image",
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PhotoCapturePanel />);
    const file = new File(["photo"], "camera.jpg", { type: "image/jpeg" });

    fireEvent.change(screen.getByLabelText("Take photo"), { target: { files: [file] } });

    expect(await screen.findByText("No stickers found")).toBeTruthy();
    const uploaded = expectUploadedFile(uploadedFile);
    expect(uploaded).not.toBe(file);
    expect(uploaded.type).toBe("image/jpeg");
    expect(uploaded.name).toBe("camera.jpg");
    expect(uploaded.size).toBe(new Blob(["converted"]).size);
  });

  it("normalizes oversized gallery images before upload", async () => {
    mockCanvasJpegConversion({ width: 3200, height: 2400 });
    let uploadedFile: File | null = null;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      uploadedFile = (init?.body as FormData).get("file") as File;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          candidates: [],
          unresolved: [],
          provider: "deterministic",
          source: "image",
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PhotoCapturePanel />);
    const file = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "gallery.jpg", {
      type: "image/jpeg",
    });

    fireEvent.change(screen.getByLabelText("Choose from gallery"), { target: { files: [file] } });

    expect(await screen.findByText("No stickers found")).toBeTruthy();
    const uploaded = expectUploadedFile(uploadedFile);
    expect(uploaded).not.toBe(file);
    expect(uploaded.type).toBe("image/jpeg");
    expect(uploaded.name).toBe("gallery.jpg");
  });

  it("shows preparation error and skips request when camera photo cannot be prepared", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<PhotoCapturePanel />);

    const file = new File(["not image"], "camera.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Take photo"), { target: { files: [file] } });

    expect(await screen.findByText("Could not analyze stickers")).toBeTruthy();
    expect(screen.getByText("This photo format could not be prepared on this device. Please try again, select the photo from your gallery, or use a JPEG/PNG image.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("shows review mode for missing-only analysis even without inferred candidates", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [],
        unresolved: [],
        provider: "gemini",
        source: "image",
        status: "needs_review",
        methodology: "missing_only_complement",
        pageType: "team",
        country: "Mexico",
        group: null,
        presentes: [],
        faltantes: [{ group: "MEX", number: "7" }],
        uncertain: [{ group: "MEX", number: null, reason: "blurred" }],
        warnings: ["Presentes were not inferred because the team group could not be identified."],
        rawModelResult: {},
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PhotoCapturePanel />);

    const file = new File(["photo"], "review-only.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose from gallery"), { target: { files: [file] } });

    expect(await screen.findByText("Faltantes detectadas por IA: MEX 7")).toBeTruthy();
    expect(screen.queryByText("No stickers found")).toBeNull();
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

  it("shows retry feedback for timeout metadata instead of empty-result feedback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [],
        unresolved: [],
        provider: "gemini",
        source: "image",
        meta: {
          status: "timeout",
          timeout: true,
          errorCode: "AI_TIMEOUT_ERROR",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PhotoCapturePanel />);

    const file = new File(["photo"], "timeout.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose from gallery"), { target: { files: [file] } });

    expect(await screen.findByText("Could not analyze stickers")).toBeTruthy();
    expect(screen.getByText("Analysis took too long. Try again with a clearer photo.")).toBeTruthy();
    expect(screen.queryByText("No stickers found")).toBeNull();
  });

  it("times out a stuck photo request and leaves loading state", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PhotoCapturePanel />);

    const file = new File(["photo"], "stuck.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Choose from gallery"), { target: { files: [file] } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    expect(screen.getByText("Could not analyze stickers")).toBeTruthy();
    expect(screen.getByText("Analysis took too long. Try again with a clearer photo.")).toBeTruthy();
    expect(screen.queryByText("Analyzing stickers")).toBeNull();
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

function mockCanvasJpegConversion({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
    width,
    height,
    close: vi.fn(),
  }));

  const canvasMock = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
    toBlob: vi.fn((callback: BlobCallback, type?: string, quality?: number) => {
      expect(type).toBe("image/jpeg");
      expect(quality).toBe(0.92);
      callback(new Blob(["converted"], { type: "image/jpeg" }));
    }),
  } as unknown as HTMLCanvasElement;

  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    if (tagName === "canvas") {
      return canvasMock;
    }
    return originalCreateElement(tagName);
  });

  return canvasMock;
}

function expectUploadedFile(file: File | null) {
  expect(file).not.toBeNull();
  if (!file) {
    throw new Error("Expected upload file.");
  }
  return file;
}
